import { useEffect } from "react";
import { useLocation } from "wouter";

export default function EditProfilePage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/onboarding?edit=1");
  }, [setLocation]);

  return null;
}
