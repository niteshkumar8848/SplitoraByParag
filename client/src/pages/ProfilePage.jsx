import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { LogOut, Lock, User } from "lucide-react";
import api from "../api/axios";
import useAuth from "../hooks/useAuth";
import useAuthStore from "../store/authStore";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import AvatarUpload from "../components/ui/AvatarUpload";
import Modal from "../components/ui/Modal";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { setUser } = useAuthStore();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || "" },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.put("/auth/profile", data),
    onSuccess: (res) => {
      const updatedUser = res?.data?.data?.user || res?.data?.user;
      if (updatedUser) setUser(updatedUser);
      toast.success("Profile updated!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => api.put("/auth/password", data),
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setIsPasswordModalOpen(false);
      resetPassword();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to change password");
    },
  });

  const onProfileSubmit = (data) => updateProfileMutation.mutate(data);
  const onPasswordSubmit = (data) => changePasswordMutation.mutate(data);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Profile</h1>
        <p className="mt-1 text-sm text-surface-600">
          Manage your account settings.
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <AvatarUpload user={user} size="xl" />
          <div>
            <h2 className="text-lg font-semibold text-surface-900">
              {user?.name}
            </h2>
            <p className="text-sm text-surface-600">{user?.email}</p>
            {user?.createdAt && (
              <p className="mt-1 text-xs text-surface-400">
                Member since{" "}
                {format(new Date(user.createdAt), "dd MMM yyyy")}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <User size={18} className="text-primary-600" />
          <h2 className="text-base font-semibold text-surface-900">
            Edit profile
          </h2>
        </div>
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
          <Input
            label="Full name"
            placeholder="Your name"
            error={profileErrors.name?.message}
            {...registerProfile("name")}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={updateProfileMutation.isPending}
            >
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Lock size={18} className="text-primary-600" />
          <h2 className="text-base font-semibold text-surface-900">
            Security
          </h2>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsPasswordModalOpen(true)}
        >
          Change password
        </Button>
      </Card>

      <Card className="border-danger-200/70">
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-danger-600">
              Danger zone
            </h2>
            <p className="mt-1 text-sm text-surface-600">
              This will sign you out of your current session.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              variant="danger"
              onClick={logout}
              leftIcon={<LogOut size={16} />}
              className="w-full sm:w-auto"
            >
              Logout
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change password"
        size="sm"
      >
        <form
          onSubmit={handlePasswordSubmit(onPasswordSubmit)}
          className="space-y-4"
        >
          <Input
            label="Current password"
            type="password"
            error={passwordErrors.currentPassword?.message}
            {...registerPassword("currentPassword")}
          />
          <Input
            label="New password"
            type="password"
            error={passwordErrors.newPassword?.message}
            {...registerPassword("newPassword")}
          />
          <Input
            label="Confirm new password"
            type="password"
            error={passwordErrors.confirmPassword?.message}
            {...registerPassword("confirmPassword")}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPasswordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={changePasswordMutation.isPending}
            >
              Change password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
