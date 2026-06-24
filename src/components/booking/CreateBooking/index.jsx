import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { AlertTriangle, Clipboard, Plus } from "lucide-react";
import styles from "./CreateBooking.module.css";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import HirerLayout from "../../layout/HirerLayout";
import BookingWorkerInfo from "./BookingWorkerInfo";
import BookingFormFields from "./BookingFormFields";

// ── Fee config ──────────────────────────────────────────────────────────────
const HIRER_FEE_RATE = 0.05;
const WORKER_FEE_RATE = 0.0;

function computeFees(agreedRate, qty = 1) {
  const subtotal = parseFloat((agreedRate * qty).toFixed(2));
  const hirerFee = parseFloat((subtotal * HIRER_FEE_RATE).toFixed(2));
  const totalToPay = parseFloat((subtotal + hirerFee).toFixed(2));
  const workerGets = subtotal;
  return { subtotal, hirerFee, totalToPay, workerGets };
}

export default function CreateBooking({ workerId: propWorkerId, onSuccess }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const initialWorkerId = propWorkerId || searchParams.get("workerId") || "";

  // ── State ──────────────────────────────────────────────────────────────
  const [worker, setWorker] = useState(null);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerError, setWorkerError] = useState("");
  const [jobPost, setJobPost] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [jobType, setJobType] = useState("FULL_TIME");
  const [locationType, setLocationType] = useState("REMOTE");
  const [budgetType, setBudgetType] = useState("HOURLY");
  const [durationType, setDurationType] = useState("HOURS");
  const [durationValue, setDurationValue] = useState("");
  const [isNegotiated, setIsNegotiated] = useState(false);
  const [negotiatedRate, setNegotiatedRate] = useState("");
  const [negotiationNote, setNegotiationNote] = useState("");
  const [form, setForm] = useState({
    workerId: initialWorkerId,
    categoryId: "",
    title: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    scheduledAt: "",
    estimatedValue: "",
    notes: "",
    requirements: "",
    responsibilities: "",
    rate: 0, // per‑unit custom rate (locked)
    customLabel: "", // custom label (locked)
    quantity: 1, // number of units (editable by hirer)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fromJobId = searchParams.get("fromJob") || null;
  const minDate = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  // ── Helpers ──────────────────────────────────────────────────────────
  const DURATION_OPTIONS = [
    {
      unit: "hours",
      label: "Hourly",
      rateKey: "hourlyRate",
      suffix: "/hr",
      inputLabel: "Hours",
      inputType: "number",
      step: "0.5",
    },
    {
      unit: "days",
      label: "Daily",
      rateKey: "dailyRate",
      suffix: "/day",
      inputLabel: "Days",
      inputType: "number",
      step: "1",
    },
    {
      unit: "weeks",
      label: "Weekly",
      rateKey: "weeklyRate",
      suffix: "/wk",
      inputLabel: "Weeks",
      inputType: "number",
      step: "1",
    },
    {
      unit: "months",
      label: "Monthly",
      rateKey: "monthlyRate",
      suffix: "/mo",
      inputLabel: "Months",
      inputType: "number",
      step: "1",
    },
    {
      unit: "custom",
      label: "Custom",
      rateKey: "customRate",
      suffix: "",
      inputLabel: "Description",
      inputType: "text",
      step: null,
    },
  ];

  const UNIT_TO_TYPES = {
    hours: { budget: "HOURLY", duration: "HOURS" },
    days: { budget: "DAILY", duration: "DAYS" },
    weeks: { budget: "WEEKLY", duration: "WEEKS" },
    months: { budget: "MONTHLY", duration: "MONTHS" },
    custom: { budget: "CUSTOM", duration: "CUSTOM" },
  };

  // ── Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedUnit && UNIT_TO_TYPES[selectedUnit]) {
      setBudgetType(UNIT_TO_TYPES[selectedUnit].budget);
      setDurationType(UNIT_TO_TYPES[selectedUnit].duration);
    }
  }, [selectedUnit]);

  useEffect(() => {
    const id = form.workerId?.trim();
    if (!id) {
      setWorker(null);
      return;
    }
    setWorkerLoading(true);
    setWorkerError("");
    api
      .get(`/workers/${id}`)
      .then((res) => {
        const w = res.data.data.worker;
        setWorker(w);

        // ── Populate custom rate fields ──
        setForm((prev) => ({
          ...prev,
          rate: w.customRate || 0,
          customLabel: w.customLabel || "",
        }));

        const available = DURATION_OPTIONS.filter((o) =>
          o.rateKey === "customRate" ? w.customRate > 0 : w[o.rateKey] > 0,
        );
        setSelectedUnit((available[0] || DURATION_OPTIONS[0]).unit);
        const primaryCat =
          w.categories?.find((c) => c.isPrimary) || w.categories?.[0];
        if (primaryCat)
          setForm((f) => ({ ...f, categoryId: primaryCat.category.id }));
      })
      .catch(() =>
        setWorkerError("Worker not found. Check the ID and try again."),
      )
      .finally(() => setWorkerLoading(false));
  }, [form.workerId]);

  useEffect(() => {
    if (!fromJobId) return;
    api
      .get(`/jobs/${fromJobId}`)
      .then((res) => {
        const jp = res.data.data.jobPost;
        setJobPost(jp);
        setForm((f) => ({
          ...f,
          categoryId: jp.categoryId || f.categoryId,
          title: jp.title || f.title,
          description: jp.description || f.description,
          address: jp.address || f.address,
          estimatedValue:
            jp.estimatedValue ||
            (jp.estimatedHours ? String(jp.estimatedHours) : f.estimatedValue),
        }));
        if (jp.estimatedUnit) setSelectedUnit(jp.estimatedUnit);
      })
      .catch(() => {});
  }, [fromJobId]);

  // ── Derived ──────────────────────────────────────────────────────────
  const isFromJob = !!fromJobId && !!jobPost;
  const currentOption = DURATION_OPTIONS.find((o) => o.unit === selectedUnit);
  const lockedRate = isFromJob
    ? jobPost?.budget || 0
    : worker && currentOption
      ? worker[currentOption.rateKey] || 0
      : 0;
  const lockedCurrency = isFromJob
    ? jobPost?.currency || "USD"
    : worker?.currency || "USD";
  const availableUnits = worker
    ? DURATION_OPTIONS.filter((o) =>
        o.rateKey === "customRate"
          ? worker.customRate > 0
          : worker[o.rateKey] > 0,
      )
    : [];
  const finalRate =
    isNegotiated && negotiatedRate ? parseFloat(negotiatedRate) : lockedRate;
  const estQty = parseFloat(form.estimatedValue) || 1;
  const estFees =
    lockedRate > 0 &&
    form.estimatedValue &&
    currentOption?.inputType === "number"
      ? computeFees(finalRate, estQty)
      : null;

  // ── Handlers ──────────────────────────────────────────────────────────
  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!worker) {
      setError("Please enter a valid Worker ID first.");
      return;
    }
    const required = [
      "workerId",
      "categoryId",
      "title",
      "description",
      ...(locationType !== "REMOTE" ? ["address"] : []),
      "scheduledAt",
    ];
    for (const k of required) {
      if (!form[k]) {
        setError(
          `Please fill in: ${k.replace(/([A-Z])/g, " $1").toLowerCase()}`,
        );
        return;
      }
    }
    // For non‑custom units, ensure a rate exists
    if (lockedRate <= 0 && currentOption?.unit !== "custom") {
      setError("This worker has not set a rate for the selected duration.");
      return;
    }

    setLoading(true);
    try {
      // ── Compute estimatedHours ──
      let estimatedHours = null;
      const rawVal = form.estimatedValue
        ? parseFloat(form.estimatedValue)
        : null;
      if (rawVal !== null) {
        if (currentOption?.unit === "hours") estimatedHours = rawVal;
        else if (currentOption?.unit === "days") estimatedHours = rawVal * 8;
        else if (currentOption?.unit === "weeks") estimatedHours = rawVal * 40;
        else if (currentOption?.unit === "months")
          estimatedHours = rawVal * 160;
      }

      // ── Build payload ──
      const payload = {
        workerId: form.workerId,
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        address: locationType === "REMOTE" ? "Remote" : form.address,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        scheduledAt: form.scheduledAt,
        estimatedHours: estimatedHours ?? undefined,
        estimatedUnit: currentOption?.unit || "hours",
        estimatedValue: form.estimatedValue || undefined,
        agreedRate: finalRate,
        isNegotiated,
        negotiatedRate: isNegotiated ? parseFloat(negotiatedRate) : undefined,
        negotiationNote:
          isNegotiated && negotiationNote ? negotiationNote : undefined,
        currency: lockedCurrency,
        notes: form.notes || undefined,
        jobType: jobType || undefined,
        locationType: locationType || undefined,
        budgetType: budgetType || undefined,
        durationType: durationType || undefined,
        requirements: form.requirements || undefined,
        responsibilities: form.responsibilities || undefined,
        // ── Custom fields ──
        quantity: form.quantity || 1,
        customLabel: form.customLabel || null,
      };

      // ── If budgetType is "CUSTOM", compute estimatedValue = rate * quantity ──
      if (budgetType === "CUSTOM" && form.rate > 0) {
        payload.estimatedValue = form.rate * (form.quantity || 1);
        payload.agreedRate = form.rate; // use the locked rate
      }

      const res = await api.post("/bookings", payload);

      const { booking } = res.data.data;
      if (onSuccess) onSuccess(booking);
      else navigate(`/bookings/${booking.id}/pay`);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Failed to create booking. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  if (user?.role !== "HIRER") {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.restrictedMsg}>
            <h2>
              <Clipboard className={styles.iconInline} size={28} /> Only Hirers
              Can Post Jobs
            </h2>
            <p>
              Workers can accept and complete jobs, but only Hirers can post
              them.
            </p>
            <button
              onClick={() => navigate("/bookings")}
              className={styles.submitBtn}
            >
              Back to Bookings
            </button>
          </div>
        </div>
      </HirerLayout>
    );
  }

  return (
    <HirerLayout>
      <Link to="/bookings" className={styles.back}>
        ← Back to Bookings
      </Link>
      <div className={styles.page}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>New Job</p>
          <h1 className={styles.title}>Create Booking</h1>
          <p className={styles.subtitle}>
            Fill in the details and the worker will be notified immediately.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <BookingWorkerInfo
            propWorkerId={propWorkerId}
            worker={worker}
            workerLoading={workerLoading}
            workerError={workerError}
            selectedUnit={selectedUnit}
            setSelectedUnit={setSelectedUnit}
            availableUnits={availableUnits}
            currentOption={currentOption}
            lockedRate={lockedRate}
            lockedCurrency={lockedCurrency}
            isFromJob={isFromJob}
            isNegotiated={isNegotiated}
            setIsNegotiated={setIsNegotiated}
            negotiatedRate={negotiatedRate}
            setNegotiatedRate={setNegotiatedRate}
            negotiationNote={negotiationNote}
            setNegotiationNote={setNegotiationNote}
            estFees={estFees}
            form={form}
            set={set}
          />

          <BookingFormFields
            worker={worker}
            jobType={jobType}
            setJobType={setJobType}
            locationType={locationType}
            setLocationType={setLocationType}
            budgetType={budgetType}
            setBudgetType={setBudgetType}
            durationType={durationType}
            setDurationType={setDurationType}
            durationValue={durationValue}
            setDurationValue={setDurationValue}
            form={form}
            set={set}
            minDate={minDate}
          />

          {error && (
            <p className={styles.error}>
              <AlertTriangle size={16} className={styles.iconInline} /> {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !worker}
          >
            {loading ? (
              <>
                <span className={styles.spinner} /> Creating booking…
              </>
            ) : (
              <>
                <span className={styles.submitBtnPlus}>
                  <Plus size={20} strokeWidth={3} />
                </span>
                Create Booking
              </>
            )}
          </button>
          <p className={styles.disclaimer}>
            The worker will be notified immediately. Payment is only charged
            after the worker accepts and you approve it.
          </p>
        </form>
      </div>
    </HirerLayout>
  );
}
