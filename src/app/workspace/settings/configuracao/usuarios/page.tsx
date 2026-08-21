"use client";

import { UserInvites } from "@/components/admin/UserInvites";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export default function UsuariosPage() {
  return (
    <div className="glass-card p-6 space-y-8">
      <UserInvites />
      <div className="border-t border-border/40 pt-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
