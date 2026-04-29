"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { fetchHospitalScope } from "@/lib/queries";

function clinicNameFromEnv(): string | undefined {
  const v = process.env.NEXT_PUBLIC_CLINIC_NAME;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function clinicAddressFromEnv(): string | undefined {
  const v = process.env.NEXT_PUBLIC_CLINIC_ADDRESS;
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export default function SummaryHeader() {
  const [name, setName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!active) return;
        if (!user) {
          setName(clinicNameFromEnv() ?? null);
          setAddress(clinicAddressFromEnv() ?? null);
          setReady(true);
          return;
        }
        const scope = await fetchHospitalScope(user);
        if (!active) return;
        const selectedHospital = scope.hospitals.find(
          (h) => h.hospital_id === scope.assignedHospitalId
        );
        const envName = clinicNameFromEnv();
        const envAddr = clinicAddressFromEnv();
        setName(selectedHospital?.hospital_name ?? envName ?? null);
        setAddress(selectedHospital?.address ?? envAddr ?? null);
      } catch {
        if (!active) return;
        setName(clinicNameFromEnv() ?? null);
        setAddress(clinicAddressFromEnv() ?? null);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="mb-3">
      {!ready ? (
        <p className="text-sm text-zinc-500">병원 정보를 불러오는 중…</p>
      ) : (
        <>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
            {name ?? "동물병원"}
          </h1>
          {address ? (
            <p className="mt-1 text-sm leading-snug text-zinc-400">{address}</p>
          ) : null}
        </>
      )}
    </header>
  );
}
