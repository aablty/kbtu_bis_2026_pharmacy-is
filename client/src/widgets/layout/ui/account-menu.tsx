import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import type { UserProfile } from "@/shared/api";
import { endSession } from "@/shared/auth";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export function AccountMenu({ user }: { user: UserProfile }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const name = user.full_name || user.email;

  function onSignOut() {
    endSession();
    navigate("/sign-in", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <Avatar size="sm">
            <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="max-w-32 truncate text-sm font-medium">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/profile">{t("auth.profile.title")}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onSignOut}>
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
