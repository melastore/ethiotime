import type { Metadata } from "next";

import AccountPanel from "@/components/account";

export const metadata: Metadata = {
  title: "Account",
  description:
    "Keep your notes, events and history on an account number, with no email and no password.",
};

const AccountPage = () => {
  return <AccountPanel />;
};

export default AccountPage;
