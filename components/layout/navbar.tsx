import Link from "next/link";
import { ROUTES } from "@/constants";

export function Navbar() {
  return (
    <nav>
      <Link href={ROUTES.dashboard}>Dashboard</Link>
      <Link href={ROUTES.settings}>Settings</Link>
    </nav>
  );
}
