"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useLocalStorage } from "@uidotdev/usehooks";
import IonIcon from "@reacticons/ionicons";
import { LocalStorageKeys } from "../lib/types";
import { Providers } from "../lib/providers";
import logo from "@/assets/logo.png";
import { checkMembershipRole, claimValidatorRole } from "../lib/api";


const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useLocalStorage<boolean>(
    LocalStorageKeys.DarkMode,
    false
  );
  const [currentGroupId] = useLocalStorage<string | null>(
    LocalStorageKeys.CurrentGroupId,
    null
  );
  const [currentProvider] = useLocalStorage<string | null>(
    LocalStorageKeys.CurrentProvider,
    null
  );
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isValidator, setIsValidator] = React.useState(false);
 
  let slug = null;
  if (currentProvider && currentGroupId) {
    const provider = Providers[currentProvider];
    slug = provider.getSlug();
  }

  // Check if user is a validator
  React.useEffect(() => {
    const checkValidatorRole = async () => {
      try {
        const hasValidatorRole = await checkMembershipRole({ role: "validator" });
        setIsValidator(hasValidatorRole);
      } catch (error) {
        console.error("Error checking validator role:", error);
        setIsValidator(false);
      }
    };

    checkValidatorRole();
  }, []);

  // Set dark mode
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);


  return (
    <>
      <div className="page">
        <div className="mobile-header">
          <button
            className={`sidebar-toggle ${isSidebarOpen ? "open" : ""}`}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            ☰
          </button>
          <div
            className="mobile-header-logo"
            style={isSidebarOpen ? { display: "none" } : {}}
          >
            <Link href="/">CrowdWisdom</Link>
          </div>
        </div>
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="logo">
            <Link href="/">
              <Image src={logo} alt="CrowdWisdom" width={200} height={50} />
            </Link>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-nav-header">
              <Link
                onClick={() => setIsSidebarOpen(false)}
                href="/"
                className="sidebar-nav-item"
              >
                Validated Claims
              </Link>

              {isValidator && (
                <Link
                  onClick={() => setIsSidebarOpen(false)}
                  href={`/vote`}
                  className="sidebar-nav-item"
                >
                 Vote on Claims
                </Link>
              )}
              {!isValidator && (
                <Link
                onClick={async () => {
                    await claimValidatorRole(); // Claim the role
                    const hasValidatorRole = await checkMembershipRole({ role: "validator" }); // Recheck
                    setIsValidator(hasValidatorRole); // Update state
                    setIsSidebarOpen(false); // Optional: close the sidebar
                }}
                  href={"#"}
                  className="sidebar-nav-item"
                >
                 Claim Validator Role
                </Link>
              )}
            </div>

            <div className="sidebar-nav-footer">
              <button
                onClick={() => {
                  setIsDark(!isDark);
                  setIsSidebarOpen(false);
                }}
                className="sidebar-nav-footer-item"
              >
                {isDark ? <IonIcon name="moon" /> : <IonIcon name="sunny" />}
              </button>
              <Link
                onClick={() => setIsSidebarOpen(false)}
                className="sidebar-nav-footer-item"
                target="_blank"
                title="Source Code"
                rel="noopener noreferrer"
                href="https://github.com/crowd-wisdom/noirhack"
              >
                <IonIcon name="logo-github" />
              </Link>
              <Link
                onClick={() => setIsSidebarOpen(false)}
                href="https://x.com/crowdwisdom_xyz"
                target="_blank"
                rel="noopener noreferrer"
                title="Twitter"
                className="sidebar-nav-footer-item"
              >
                <IonIcon name="logo-twitter" />
              </Link>
            </div>
          </nav>

          <p className="sidebar-nav-copyright">
            <span>Made with </span>
            <Link 
              href="https://noir-lang.org" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ color: '#382E81' }}
            >
              Noir
            </Link>
            <span> ❤️ </span>
          </p>
        </aside>
        <main className="container">
          <div className="description">{children}</div>
        </main>
      </div>
    </>
  );
};

const LayoutClient = dynamic(() => Promise.resolve(Layout), {
  ssr: false,
});

export default LayoutClient;
