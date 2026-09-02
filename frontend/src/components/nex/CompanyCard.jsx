import { useState } from "react";
import { motion } from "framer-motion";
import {
  FiArrowUpRight,
  FiBookmark,
  FiBriefcase,
  FiCheck,
  FiMapPin,
  FiSend,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { sendIntroRequest } from "@/lib/api/notificationClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function CompanyCard({ company, saved, onSave, index, onRequestSent }) {
  const { user } = useAuth();
  const [requestStatus, setRequestStatus] = useState(null); // 'sending' | 'sent' | 'error'
  const [requestMsg, setRequestMsg] = useState("");

  async function handleSendRequest() {
    if (!user) return;
    setRequestStatus("sending");
    try {
      const type = company.hiring && user.role === "student" ? "application" : "intro_request";
      await sendIntroRequest({
        startupId: company.id,
        type,
        message: `${user.name} (${user.role}) requested an introduction to ${company.name}.`,
      });
      setRequestStatus("sent");
      if (onRequestSent) onRequestSent(company.id);
    } catch (err) {
      setRequestStatus("error");
      setRequestMsg(err.message || "Failed to send request.");
      setTimeout(() => setRequestStatus(null), 3000);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.045, 0.3) }}
      className="group rounded-[1.35rem] border border-foreground/10 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_20px_50px_-35px_rgba(17,24,39,.35)] sm:p-6"
    >
      <div className="flex items-start gap-4 sm:gap-5">
        <div
          className="flex size-13 shrink-0 items-center justify-center rounded-2xl text-sm font-bold tracking-[-0.04em] text-white sm:size-14"
          style={{ backgroundColor: company.color }}
          aria-hidden="true"
        >
          {company.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-semibold tracking-[-0.04em] sm:text-xl">
                  {company.name}
                </h2>
                {company.top ? (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-background uppercase">
                    Top signal
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                {company.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`${saved ? "Remove" : "Save"} ${company.name}`}
                aria-pressed={saved}
                onClick={() => onSave(company.id)}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                  saved
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/10 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                <FiBookmark className={cn("size-4", saved && "fill-current")} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FiMapPin /> {company.location}
            </span>
            <span>Founded {company.founded}</span>
            <span className="flex items-center gap-1.5">
              <FiUsers /> {company.team} people
            </span>
            {company.hiring ? (
              <span className="flex items-center gap-1.5 text-success">
                <FiBriefcase /> Hiring
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Metrics Row + Action */}
      <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-foreground/8 bg-foreground/8 sm:ml-19 sm:grid-cols-[1fr_1fr_1fr_1.65fr]">
        <Signal label="Stage" value={company.stage} />
        <Signal label="Raised" value={company.funding} />
        <Signal label="6m growth" value={`+${company.growth}%`} positive />
        <div className="col-span-3 flex items-center justify-between bg-background/75 px-3.5 py-3 sm:col-span-1">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold">{company.founder}</p>
            <p className="truncate text-[9px] text-muted-foreground">{company.founderRole}</p>
          </div>

          {/* Intro Request / Apply Action */}
          {user && (
            <button
              type="button"
              disabled={requestStatus === "sending" || requestStatus === "sent"}
              onClick={handleSendRequest}
              className={cn(
                "ml-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                requestStatus === "sent"
                  ? "bg-emerald-500/15 text-emerald-500"
                  : requestStatus === "error"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-primary text-primary-foreground hover:opacity-90 active:scale-95",
              )}
            >
              {requestStatus === "sending" ? (
                <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : requestStatus === "sent" ? (
                <>
                  <FiCheck className="size-3" /> Requested
                </>
              ) : (
                <>
                  <FiSend className="size-3" />{" "}
                  {company.hiring && user.role === "student" ? "Apply" : "Request Intro"}
                </>
              )}
            </button>
          )}

          {!user && (
            <FiArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
          )}
        </div>
      </div>
    </motion.article>
  );
}

function Signal({ label, value, positive }) {
  return (
    <div className="bg-background/75 px-3.5 py-3">
      <p className="text-[9px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("mt-0.5 text-xs font-bold", positive && "text-success")}>{value}</p>
    </div>
  );
}
