import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, AlertTriangle, ClipboardList, Truck, PackageCheck, Ban, Archive, Clock, Pencil,
} from "lucide-react";
import type { SOStatus } from "./types";

interface StageTransitionOverlayProps {
  status: SOStatus;
}

/**
 * Labels use "Marking as …" / "Marked as …" phrasing so the overlay
 * reads as an intentional action rather than an error state.
 */
const STATUS_CONFIG: Record<string, { transitionLabel: string; icon: typeof Check; color: string }> = {
  Draft: { transitionLabel: "Marked as Draft", icon: Pencil, color: "var(--foreground)" },
  "Pending Review": { transitionLabel: "Submitted for Review", icon: AlertTriangle, color: "var(--chart-3)" },
  Cleared: { transitionLabel: "Cleared by Ops", icon: Check, color: "var(--accent)" },
  "Partially Shipped": { transitionLabel: "Partially Shipped", icon: Truck, color: "var(--chart-4)" },
  Shipped: { transitionLabel: "Order Shipped", icon: Truck, color: "var(--accent)" },
  Closed: { transitionLabel: "Marked as Closed", icon: Check, color: "var(--chart-4)" },
  Cancelled: { transitionLabel: "Order Marked as Cancelled", icon: Ban, color: "var(--destructive)" },
  "Cancellation Requested": { transitionLabel: "Cancellation Submitted for Review", icon: Clock, color: "var(--destructive)" },
  "Partially Cancelled": { transitionLabel: "Line Items Marked as Cancelled", icon: Ban, color: "var(--chart-3)" },
  Archived: { transitionLabel: "Marked as Archived", icon: Archive, color: "var(--foreground)" },
};

export function StageTransitionOverlay({ status }: StageTransitionOverlayProps) {
  const [show, setShow] = useState(false);
  const [transitionStatus, setTransitionStatus] = useState<SOStatus | null>(null);
  const prevStatusRef = useRef(status);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevStatusRef.current = status;
      return;
    }
    if (status !== prevStatusRef.current) {
      prevStatusRef.current = status;
      setTransitionStatus(status);
      setShow(true);
      const timer = setTimeout(() => setShow(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const config = transitionStatus ? STATUS_CONFIG[transitionStatus] : null;
  if (!config) return null;

  const Icon = config.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0"
          style={{
            zIndex: "var(--z-toast)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop — translucent white with blur */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "var(--background)",
              opacity: 0.5,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Centered content wrapper */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Icon circle + concentric rings — rings anchored to icon */}
            <div className="relative" style={{ width: 64, height: 64 }}>
              {/* Concentric rings — outermost */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 160,
                  height: 160,
                  top: 32,
                  left: 32,
                  marginTop: -80,
                  marginLeft: -80,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: config.color,
                  opacity: 0.06,
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.06 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Concentric ring — middle */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 120,
                  height: 120,
                  top: 32,
                  left: 32,
                  marginTop: -60,
                  marginLeft: -60,
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: config.color,
                  opacity: 0.1,
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.1 }}
                exit={{ scale: 1.15, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              />

              {/* Concentric ring — inner filled */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 88,
                  height: 88,
                  top: 32,
                  left: 32,
                  marginTop: -44,
                  marginLeft: -44,
                  backgroundColor: config.color,
                  opacity: 0.08,
                }}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.08 }}
                exit={{ scale: 1.1, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
              />

              {/* Icon circle */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 64,
                  height: 64,
                  top: 0,
                  left: 0,
                  backgroundColor: config.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                >
                  <Icon className="w-7 h-7" style={{ color: "var(--accent-foreground)" }} strokeWidth={2.5} />
                </motion.div>
              </motion.div>
            </div>

            {/* Status label */}
            <motion.span
              style={{
                marginTop: 16,
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)",
                color: config.color,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              {config.transitionLabel}
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}