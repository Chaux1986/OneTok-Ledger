"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

export function SetupAccountsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/setup/seed-accounts", {
        method: "POST",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to set up accounts");
      }
    } catch (error) {
      console.error("Setup error:", error);
      alert("Failed to set up accounts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleSetup} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Setting up...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Use PNG Template
        </>
      )}
    </Button>
  );
}
