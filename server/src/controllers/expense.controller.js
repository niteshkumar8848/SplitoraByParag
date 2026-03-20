const prisma = require("../config/db");
const ApiResponse = require("../utils/apiResponse");

const getUserId = (req) => req.user && req.user.userId;

const getMembership = async (userId, groupId) =>
  prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { role: true, userId: true },
  });

const ensureMembersBelongToGroup = async (groupId, userIds) => {
  const uniqueIds = [...new Set(userIds)];
  const members = await prisma.groupMember.findMany({
    where: { groupId, userId: { in: uniqueIds } },
    select: { userId: true },
  });
  return members.length === uniqueIds.length;
};

const buildShares = ({ splitType, amount, memberIds, sharesInput }) => {
  const parsedAmount = Number(amount);

  if (splitType === "equal") {
    if (!memberIds || !memberIds.length) {
      throw new Error("memberIds required for equal split");
    }
    const count = memberIds.length;
    const baseShare = Number((parsedAmount / count).toFixed(2));
    let distributed = 0;
    const shares = memberIds.map((userId, index) => {
      const isLast = index === count - 1;
      const shareAmount = isLast
        ? Number((parsedAmount - distributed).toFixed(2))
        : baseShare;
      distributed += baseShare;
      return { userId, amount: shareAmount, percentage: null };
    });
    return { splitType: "equal", memberIds, shares };
  }

  if (splitType === "percentage") {
    if (!sharesInput || !sharesInput.length) {
      throw new Error("shares required for percentage split");
    }
    const totalPct = sharesInput.reduce(
      (s, x) => s + Number(x.percentage || 0),
      0
    );
    if (Math.abs(totalPct - 100) > 0.01) {
      throw new Error("Percentage shares must total 100%");
    }
    const shares = sharesInput.map((item) => ({
      userId: item.userId,
      amount: Number(
        ((Number(item.percentage) / 100) * parsedAmount).toFixed(2)
      ),
      percentage: Number(item.percentage),
    }));
    return {
      splitType: "percentage",
      memberIds: shares.map((s) => s.userId),
      shares,
    };
  }

  if (splitType === "custom") {
    if (!sharesInput || !sharesInput.length) {
      throw new Error("shares required for custom split");
    }
    const total = sharesInput.reduce(
      (s, x) => s + Number(x.amount || 0),
      0
    );
    if (Math.abs(total - parsedAmount) > 0.01) {
      throw new Error(
        "Custom split amounts must equal total expense amount"
      );
    }
    const shares = sharesInput.map((item) => ({
      userId: item.userId,
      amount: Number(Number(item.amount).toFixed(2)),
      percentage: null,
    }));
    return {
      splitType: "custom",
      memberIds: shares.map((s) => s.userId),
      shares,
    };
  }

  throw new Error(`Invalid split type: ${splitType}`);
};

const createExpense = async (req, res, next) => {
  try {
    const requesterId = getUserId(req);
    const {
      groupId,
      title,
      amount,
      splitType = "equal",
      category,
      note,
      receiptUrl,
      date,
      paidById,
      memberIds,
      shares,
    } = req.body;

    if (!requesterId) return ApiResponse.error(res, "Unauthorized", 401);
    if (!groupId || !title || amount === undefined)
      return ApiResponse.error(
        res,
        "groupId, title, and amount are required",
        400
      );

    const membership = await getMembership(requesterId, groupId);
    if (!membership)
      return ApiResponse.error(
        res,
        "Access denied: not a group member",
        403
      );

    let split;
    try {
      split = buildShares({
        splitType,
        amount,
        memberIds,
        sharesInput: shares,
      });
    } catch (err) {
      return ApiResponse.error(res, err.message, 400);
    }

    const payerId = paidById || requesterId;

    const usersAreMembers = await ensureMembersBelongToGroup(groupId, [
      ...split.memberIds,
      payerId,
    ]);
    if (!usersAreMembers)
      return ApiResponse.error(
        res,
        "All members and payer must belong to the group",
        400
      );

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          groupId,
          title,
          amount: Number(amount),
          splitType: split.splitType,
          category: category || "general",
          note: note || null,
          receiptUrl: receiptUrl || null,
          date: date ? new Date(date) : new Date(),
          paidById: payerId,
        },
      });

      await tx.expenseShare.createMany({
        data: split.shares.map((item) => ({
          expenseId: expense.id,
          userId: item.userId,
          amount: item.amount,
          percentage: item.percentage,
        })),
      });

      return tx.expense.findUnique({
        where: { id: expense.id },
        include: {
          paidBy: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          shares: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });
    });

    return ApiResponse.success(
      res,
      { expense: result },
      "Expense created successfully",
      201
    );
  } catch (err) {
    return next(err);
  }
};

const getGroupExpenses = async (req, res, next) => {
  try {
    const requesterId = getUserId(req);
    const { groupId } = req.params;

    if (!requesterId) return ApiResponse.error(res, "Unauthorized", 401);

    const membership = await getMembership(requesterId, groupId);
    if (!membership)
      return ApiResponse.error(
        res,
        "Access denied: not a group member",
        403
      );

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 25, 1),
      100
    );
    const skip = (page - 1) * limit;

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where: { groupId } }),
      prisma.expense.findMany({
        where: { groupId },
        include: {
          paidBy: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          shares: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return ApiResponse.success(res, expenses, "Expenses fetched successfully");
  } catch (err) {
    return next(err);
  }
};

const getExpenseById = async (req, res, next) => {
  try {
    const requesterId = getUserId(req);
    const { id } = req.params;

    if (!requesterId) return ApiResponse.error(res, "Unauthorized", 401);

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true, category: true } },
        paidBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        shares: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    if (!expense) return ApiResponse.error(res, "Expense not found", 404);

    const membership = await getMembership(requesterId, expense.groupId);
    if (!membership)
      return ApiResponse.error(
        res,
        "Access denied: not a group member",
        403
      );

    return ApiResponse.success(
      res,
      { expense },
      "Expense fetched successfully"
    );
  } catch (err) {
    return next(err);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const requesterId = getUserId(req);
    const { id } = req.params;

    if (!requesterId) return ApiResponse.error(res, "Unauthorized", 401);

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      include: { shares: true },
    });

    if (!existingExpense)
      return ApiResponse.error(res, "Expense not found", 404);

    const membership = await getMembership(
      requesterId,
      existingExpense.groupId
    );
    if (!membership)
      return ApiResponse.error(
        res,
        "Access denied: not a group member",
        403
      );

    const isAdmin = membership.role === "admin";
    const isCreator = existingExpense.paidById === requesterId;
    if (!isAdmin && !isCreator)
      return ApiResponse.error(
        res,
        "Only expense creator or group admin can update",
        403
      );

    const {
      title,
      amount,
      splitType,
      category,
      note,
      receiptUrl,
      date,
      paidById,
      memberIds,
      shares,
    } = req.body;

    const nextAmount =
      amount !== undefined ? Number(amount) : existingExpense.amount;
    const nextSplitType = splitType || existingExpense.splitType;
    const fallbackMemberIds = existingExpense.shares.map((s) => s.userId);
    const fallbackShares = existingExpense.shares.map((s) => ({
      userId: s.userId,
      amount: s.amount,
      percentage: s.percentage,
    }));

    let split;
    try {
      split = buildShares({
        splitType: nextSplitType,
        amount: nextAmount,
        memberIds: memberIds || fallbackMemberIds,
        sharesInput: shares || fallbackShares,
      });
    } catch (err) {
      return ApiResponse.error(res, err.message, 400);
    }

    const nextPayerId = paidById || existingExpense.paidById;
    const usersAreMembers = await ensureMembersBelongToGroup(
      existingExpense.groupId,
      [...split.memberIds, nextPayerId]
    );
    if (!usersAreMembers)
      return ApiResponse.error(
        res,
        "All members and payer must belong to the group",
        400
      );

    const updatedExpense = await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id },
        data: {
          title: title !== undefined ? title : existingExpense.title,
          amount: nextAmount,
          splitType: split.splitType,
          category:
            category !== undefined ? category : existingExpense.category,
          note: note !== undefined ? note : existingExpense.note,
          receiptUrl:
            receiptUrl !== undefined
              ? receiptUrl
              : existingExpense.receiptUrl,
          date:
            date !== undefined ? new Date(date) : existingExpense.date,
          paidById: nextPayerId,
        },
      });

      await tx.expenseShare.deleteMany({ where: { expenseId: id } });
      await tx.expenseShare.createMany({
        data: split.shares.map((item) => ({
          expenseId: id,
          userId: item.userId,
          amount: item.amount,
          percentage: item.percentage,
        })),
      });

      return tx.expense.findUnique({
        where: { id },
        include: {
          paidBy: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          shares: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });
    });

    return ApiResponse.success(
      res,
      { expense: updatedExpense },
      "Expense updated successfully"
    );
  } catch (err) {
    return next(err);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const requesterId = getUserId(req);
    const { id } = req.params;

    if (!requesterId) return ApiResponse.error(res, "Unauthorized", 401);

    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { id: true, groupId: true, paidById: true },
    });

    if (!expense) return ApiResponse.error(res, "Expense not found", 404);

    const membership = await getMembership(requesterId, expense.groupId);
    if (!membership)
      return ApiResponse.error(
        res,
        "Access denied: not a group member",
        403
      );

    const isAdmin = membership.role === "admin";
    const isCreator = expense.paidById === requesterId;
    if (!isAdmin && !isCreator)
      return ApiResponse.error(
        res,
        "Only expense creator or group admin can delete",
        403
      );

    await prisma.expense.delete({ where: { id } });

    return ApiResponse.success(res, null, "Expense deleted successfully");
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createExpense,
  getGroupExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};