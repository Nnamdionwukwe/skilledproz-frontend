// src/components/RetainedStaff/AddStaffModal.js
//
// Ported from src/pages/hirer/retained-staff/AddStaffModal.jsx +
// AddStaffModal.module.css.
//
// Mapping reference:
//   react-icons  →  @expo/vector-icons (Ionicons)
//     FiSearch        → "search-outline"
//     FiX             → "close"
//     FiUser          → "person-outline"
//     FiChevronRight  → "chevron-forward"
//     FiAlertCircle   → "alert-circle-outline"
//     FiCheckCircle   → "checkmark-circle-outline"
//     FiLoader        → ActivityIndicator (only spinner; allowed)
//     FiMapPin        → "location-outline"
//     FiNavigation    → "navigate-outline"
//
// Web features translated:
//   • overlay uses expo-blur <BlurView> for backdrop-filter: blur(4px)
//   • search debounce → useDebouncedValue(350ms)
//   • form grid 2-col collapses to 1-col at ≤560 (mirrors CSS)
//   • navigator.geolocation → expo-location (requestForegroundPermissionsAsync
//     + getCurrentPositionAsync) + Nominatim reverse geocode via fetch
//   • all `alert()`/browser errors → toast (we use useToast()).
//     The inline .errorBanner is preserved (verbatim from web) since it's
//     a persistent inline error, not a transient toast.
//   • success path calls onSuccess(member) then onClose() — same as web.

import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { retainedStaffApi } from "../../api/retainedStaff";
import { useDebouncedValue } from "../../hooks/useDebounce";

const PAY_FREQUENCIES = [
  { value: "WEEKLY", key: "weekly" },
  { value: "BIWEEKLY", key: "biweekly" },
  { value: "SEMI_MONTHLY", key: "semiMonthly" },
  { value: "MONTHLY", key: "monthly" },
  { value: "QUARTERLY", key: "quarterly" },
  { value: "ON_DEMAND", key: "onDemand" },
];
const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", key: "fullTime" },
  { value: "PART_TIME", key: "partTime" },
  { value: "CONTRACT", key: "contract" },
  { value: "CASUAL", key: "casual" },
];
const LOCATION_TYPES = [
  { value: "ON_SITE", key: "onSite" },
  { value: "REMOTE", key: "remote" },
  { value: "HYBRID", key: "hybrid" },
];
const WORK_DAYS = [
  { value: "MON", key: "mon" },
  { value: "TUE", key: "tue" },
  { value: "WED", key: "wed" },
  { value: "THU", key: "thu" },
  { value: "FRI", key: "fri" },
  { value: "SAT", key: "sat" },
  { value: "SUN", key: "sun" },
];
const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

function emptyForm() {
  return {
    jobTitle: "",
    department: "",
    employmentType: "FULL_TIME",
    locationType: "ON_SITE",
    location: "",
    latitude: null,
    longitude: null,
    description: "",
    payRate: "",
    currency: "NGN",
    payFrequency: "MONTHLY",
    overtimeRate: "",
    workDays: ["MON", "TUE", "WED", "THU", "FRI"],
    workStart: "09:00",
    workEnd: "17:00",
    timezone: "Africa/Lagos",
    employeeNumber: "",
    managerName: "",
    emergencyContact: "",
    notes: "",
  };
}

export default function AddStaffModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const { width } = useWindowDimensions();
  const isNarrow = width <= 560;

  const [step, setStep] = useState(1);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const debouncedQuery = useDebouncedValue(searchQuery, 350);

  // Reset when opening (mirrors web useEffect [isOpen])
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedWorker(null);
      setSearchQuery("");
      setSearchResults([]);
      setManualEmail("");
      setError("");
      setLocating(false);
      setForm(emptyForm());
    }
  }, [isOpen]);

  // Debounced search (mirrors web useEffect [searchQuery])
  useEffect(() => {
    let cancelled = false;
    const q = debouncedQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    (async () => {
      setSearching(true);
      try {
        const res = await retainedStaffApi.lookupWorker(q);
        if (cancelled) return;
        setSearchResults(res.data?.data?.workers || []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelectWorker = (worker) => {
    setSelectedWorker(worker);
    setStep(2);
  };

  const handleManualEmail = async () => {
    if (!manualEmail.trim() || !manualEmail.includes("@")) {
      setError(t("retainedStaff.invalidEmail"));
      return;
    }
    setSearching(true);
    setError("");
    try {
      const res = await retainedStaffApi.lookupWorker(manualEmail.trim());
      const worker = res.data?.data?.workers?.[0];
      if (!worker) {
        setError(t("retainedStaff.noWorkerWithEmail"));
        return;
      }
      setSelectedWorker(worker);
      setStep(2);
    } catch {
      setError(t("retainedStaff.couldNotFindWorker"));
    } finally {
      setSearching(false);
    }
  };

  const toggleWorkDay = (day) => {
    setForm((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day],
    }));
  };

  const handleAutoLocate = async () => {
    setError("");
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError(t("retainedStaff.locationPermissionDenied"));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = pos.coords;

      let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { headers: { "User-Agent": "SkilledProz/1.0" } },
        );
        const data = await res.json();
        if (data?.display_name) address = data.display_name;
      } catch {}

      setForm((prev) => ({
        ...prev,
        location: address,
        latitude,
        longitude,
      }));
    } catch (err) {
      const code = err?.code;
      if (code === "E_LOCATION_UNAVAILABLE")
        setError(t("retainedStaff.locationUnavailable"));
      else if (code === "E_LOCATION_TIMEOUT")
        setError(t("retainedStaff.locationTimeout"));
      else setError(t("retainedStaff.couldNotGetLocation"));
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.jobTitle.trim()) {
      setError(t("retainedStaff.jobTitleRequired"));
      return;
    }
    if (!form.payRate || parseFloat(form.payRate) <= 0) {
      setError(t("retainedStaff.payRateRequired"));
      return;
    }
    if (
      ["ON_SITE", "HYBRID"].includes(form.locationType) &&
      !form.location.trim()
    ) {
      setError(t("retainedStaff.locationRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        workerId: selectedWorker.id,
        jobTitle: form.jobTitle.trim(),
        department: form.department.trim() || undefined,
        employmentType: form.employmentType,
        locationType: form.locationType,
        location: form.location.trim() || undefined,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        description: form.description.trim() || undefined,
        payRate: parseFloat(form.payRate),
        currency: form.currency,
        payFrequency: form.payFrequency,
        overtimeRate: form.overtimeRate
          ? parseFloat(form.overtimeRate)
          : undefined,
        workDays: form.workDays,
        workStart: form.workStart,
        workEnd: form.workEnd,
        timezone: form.timezone,
        employeeNumber: form.employeeNumber.trim() || undefined,
        managerName: form.managerName.trim() || undefined,
        emergencyContact: form.emergencyContact.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      const res = await retainedStaffApi.addStaff(payload);
      const member = res.data?.data?.member;
      toast.success(t("retainedStaff.addToStaff"));
      onSuccess?.(member);
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message || t("retainedStaff.addStaffFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const showLocationField = ["ON_SITE", "HYBRID"].includes(form.locationType);

  // ─── shared styles values ───────────────────────────────────
  const rem = (n) => n * 16 * fontScale;
  const overlayBg = "rgba(0,0,0,0.7)";
  const modalBg = theme.colors.bgPanel;
  const modalBorder = theme.colors.border;
  const inputBg = theme.colors.bgInput;
  const inputBorder = theme.colors.border;
  const textPrimary = theme.colors.text;
  const textDim = theme.colors.textDim;
  const textMuted = theme.colors.textMuted;
  const orange = theme.colors.orange;
  const red = theme.colors.red;
  const redDim = theme.colors.redDim;
  const green = theme.colors.green;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlayRoot}>
        {Platform.OS !== "web" ? (
          <BlurView
            tint="dark"
            intensity={30}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: overlayBg }]}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
        >
          <View
            style={[
              styles.modal,
              {
                backgroundColor: modalBg,
                borderColor: modalBorder,
              },
            ]}
          >
            {/* ── Header ── */}
            <View
              style={[
                styles.header,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    fontFamily:
                      theme.fonts?.displayBlack || "Syne_800ExtraBold",
                    fontSize: rem(1.25),
                    lineHeight: rem(1.25) * 1.15,
                    fontWeight: "800",
                    color: textPrimary,
                    letterSpacing: -0.02 * rem(1.25),
                  }}
                >
                  {step === 1
                    ? t("retainedStaff.addStaffTitle")
                    : t("retainedStaff.employmentDetailsTitle")}
                </AppText>
                <AppText
                  numberOfLines={2}
                  style={{
                    fontFamily: theme.fonts?.body || "DMSans_400Regular",
                    fontSize: rem(0.8),
                    lineHeight: rem(0.8) * 1.35,
                    color: textDim,
                    marginTop: 4,
                  }}
                >
                  {step === 1
                    ? t("retainedStaff.searchSubtitle")
                    : t("retainedStaff.setupPayrollFor", {
                        name:
                          `${selectedWorker?.firstName || ""} ${
                            selectedWorker?.lastName || ""
                          }`.trim() || "",
                      })}
                </AppText>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={{ padding: 4, marginLeft: 8 }}
              >
                <Ionicons name="close" size={22} color={textDim} />
              </Pressable>
            </View>

            {/* ── Error banner ── */}
            {error ? (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: redDim,
                    borderColor: "rgba(239,68,68,0.3)",
                  },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={16} color={red} />
                <AppText
                  style={{
                    flex: 1,
                    fontFamily: theme.fonts?.bodySemiBold,
                    fontSize: rem(0.85),
                    lineHeight: rem(0.85) * 1.35,
                    fontWeight: "600",
                    color: red,
                    marginLeft: 6,
                  }}
                >
                  {error}
                </AppText>
              </View>
            ) : null}

            {/* ── STEP 1 ── */}
            {step === 1 ? (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
              >
                {/* Search input */}
                <View style={styles.searchWrap}>
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color={textMuted}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t("retainedStaff.searchPlaceholder")}
                    placeholderTextColor={textMuted}
                    autoFocus
                    style={[
                      styles.searchInput,
                      {
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        color: textPrimary,
                        fontFamily: theme.fonts?.body || "DMSans_400Regular",
                        fontSize: rem(0.95),
                      },
                    ]}
                  />
                  {searching ? (
                    <ActivityIndicator
                      size="small"
                      color={orange}
                      style={styles.searchSpinner}
                    />
                  ) : null}
                </View>

                {/* Results */}
                {searchResults.length > 0 ? (
                  <ScrollView
                    style={{ maxHeight: 300 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    <View style={{ gap: 4 }}>
                      {searchResults.map((w) => (
                        <Pressable
                          key={w.id}
                          onPress={() => handleSelectWorker(w)}
                          style={({ pressed }) => [
                            styles.resultItem,
                            {
                              borderColor: pressed ? orange : inputBorder,
                              backgroundColor: pressed
                                ? theme.colors.bgCard
                                : "transparent",
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.resultAvatar,
                              { backgroundColor: inputBg },
                            ]}
                          >
                            <Ionicons
                              name="person-outline"
                              size={18}
                              color={textMuted}
                            />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <AppText
                              numberOfLines={1}
                              style={{
                                fontFamily:
                                  theme.fonts?.bodyBold || "DMSans_700Bold",
                                fontSize: rem(0.9),
                                fontWeight: "700",
                                color: textPrimary,
                              }}
                            >
                              {w.firstName} {w.lastName}
                            </AppText>
                            <AppText
                              numberOfLines={1}
                              style={{
                                fontFamily:
                                  theme.fonts?.body || "DMSans_400Regular",
                                fontSize: rem(0.75),
                                color: textDim,
                                marginTop: 2,
                              }}
                            >
                              {w.workerProfile?.title || "Worker"}
                              {w.city ? ` · ${w.city}` : ""}
                            </AppText>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={textMuted}
                          />
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                ) : null}

                {searchQuery.length >= 2 &&
                !searching &&
                searchResults.length === 0 ? (
                  <AppText
                    align="center"
                    style={{
                      paddingVertical: rem(1.5),
                      fontFamily: theme.fonts?.body || "DMSans_400Regular",
                      fontSize: rem(0.85),
                      color: textDim,
                    }}
                  >
                    {t("retainedStaff.noWorkersFound")}
                  </AppText>
                ) : null}

                {/* Divider */}
                <View style={styles.divider}>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                  <AppText
                    style={{
                      fontFamily: theme.fonts?.bodyMedium || "DMSans_500Medium",
                      fontSize: rem(0.75),
                      color: textMuted,
                      textTransform: "uppercase",
                      letterSpacing: 0.05 * rem(0.75),
                      paddingHorizontal: rem(0.5),
                    }}
                  >
                    {t("retainedStaff.orAddByEmail")}
                  </AppText>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                </View>

                {/* Email row */}
                <View style={styles.emailWrap}>
                  <TextInput
                    value={manualEmail}
                    onChangeText={setManualEmail}
                    placeholder={t("retainedStaff.emailPlaceholder")}
                    placeholderTextColor={textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleManualEmail}
                    style={[
                      styles.emailInput,
                      {
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        color: textPrimary,
                        fontFamily: theme.fonts?.body || "DMSans_400Regular",
                        fontSize: rem(0.9),
                      },
                    ]}
                  />
                  <Pressable
                    onPress={handleManualEmail}
                    disabled={searching || !manualEmail.trim()}
                    style={({ pressed }) => [
                      styles.emailBtn,
                      {
                        backgroundColor: orange,
                        opacity:
                          searching || !manualEmail.trim()
                            ? 0.5
                            : pressed
                              ? 0.85
                              : 1,
                      },
                    ]}
                  >
                    {searching ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <AppText
                        style={{
                          fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                          fontSize: rem(0.85),
                          fontWeight: "700",
                          color: "#fff",
                        }}
                      >
                        {t("retainedStaff.findBtn")}
                      </AppText>
                    )}
                  </Pressable>
                </View>
                <AppText
                  style={{
                    fontFamily: theme.fonts?.body || "DMSans_400Regular",
                    fontSize: rem(0.75),
                    color: textMuted,
                    marginTop: 8,
                  }}
                >
                  {t("retainedStaff.mustHaveAccount")}
                </AppText>
              </ScrollView>
            ) : null}

            {/* ── STEP 2 ── */}
            {step === 2 ? (
              <>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.body}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Selected worker */}
                  <View
                    style={[
                      styles.selectedWorker,
                      {
                        backgroundColor: theme.colors.bgCard,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.resultAvatar,
                        { backgroundColor: inputBg },
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={textMuted}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText
                        numberOfLines={1}
                        style={{
                          fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                          fontSize: rem(0.9),
                          fontWeight: "700",
                          color: textPrimary,
                        }}
                      >
                        {selectedWorker?.firstName} {selectedWorker?.lastName}
                      </AppText>
                      <AppText
                        numberOfLines={1}
                        style={{
                          fontFamily: theme.fonts?.body || "DMSans_400Regular",
                          fontSize: rem(0.75),
                          color: textDim,
                        }}
                      >
                        {selectedWorker?.email}
                      </AppText>
                    </View>
                    <Pressable
                      onPress={() => setStep(1)}
                      style={({ pressed }) => [
                        styles.changeBtn,
                        {
                          borderColor: pressed ? orange : theme.colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <AppText
                        style={{
                          fontFamily:
                            theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                          fontSize: rem(0.8),
                          fontWeight: "600",
                          color: pressed ? orange : textDim,
                        }}
                      >
                        {t("retainedStaff.changeBtn")}
                      </AppText>
                    </Pressable>
                  </View>

                  {/* ── Section: Role ── */}
                  <SectionTitle
                    text={t("retainedStaff.roleAndPosition")}
                    theme={theme}
                    rem={rem}
                  />
                  <View
                    style={[styles.formGrid, isNarrow && styles.formGridSingle]}
                  >
                    <Field
                      label={t("retainedStaff.jobTitle")}
                      required
                      value={form.jobTitle}
                      onChangeText={(v) => setForm({ ...form, jobTitle: v })}
                      placeholder="e.g. Senior Developer"
                      theme={theme}
                      rem={rem}
                    />
                    <Field
                      label={t("retainedStaff.department")}
                      value={form.department}
                      onChangeText={(v) => setForm({ ...form, department: v })}
                      placeholder="e.g. Engineering"
                      theme={theme}
                      rem={rem}
                    />

                    <SelectField
                      label={t("retainedStaff.employmentType")}
                      value={form.employmentType}
                      options={EMPLOYMENT_TYPES.map((o) => ({
                        value: o.value,
                        label: t(`retainedStaff.${o.key}`),
                      }))}
                      onChange={(v) => setForm({ ...form, employmentType: v })}
                      theme={theme}
                      rem={rem}
                    />
                    <SelectField
                      label={t("retainedStaff.locationType")}
                      value={form.locationType}
                      options={LOCATION_TYPES.map((o) => ({
                        value: o.value,
                        label: t(`retainedStaff.${o.key}`),
                      }))}
                      onChange={(v) => setForm({ ...form, locationType: v })}
                      theme={theme}
                      rem={rem}
                    />

                    {/* Location (only ON_SITE / HYBRID) */}
                    {showLocationField ? (
                      <View style={{ width: "100%", marginBottom: 8 }}>
                        <AppText
                          style={{
                            fontFamily:
                              theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                            fontSize: rem(0.75),
                            fontWeight: "600",
                            color: textDim,
                            textTransform: "uppercase",
                            letterSpacing: 0.05 * rem(0.75),
                            marginBottom: 6,
                          }}
                        >
                          {t("retainedStaff.workLocation")}
                        </AppText>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            alignItems: "stretch",
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={styles.locationInputWrap}>
                              <Ionicons
                                name="location-outline"
                                size={16}
                                color={textMuted}
                                style={{
                                  position: "absolute",
                                  left: 12,
                                  top: 14,
                                  zIndex: 1,
                                }}
                              />
                              <TextInput
                                value={form.location}
                                onChangeText={(v) =>
                                  setForm({
                                    ...form,
                                    location: v,
                                    latitude: null,
                                    longitude: null,
                                  })
                                }
                                placeholder={t(
                                  "retainedStaff.workLocationPlaceholder",
                                )}
                                placeholderTextColor={textMuted}
                                style={[
                                  styles.inputBase,
                                  {
                                    backgroundColor: inputBg,
                                    borderColor: inputBorder,
                                    color: textPrimary,
                                    fontFamily:
                                      theme.fonts?.body || "DMSans_400Regular",
                                    fontSize: rem(0.9),
                                    paddingLeft: 36,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                          <Pressable
                            onPress={handleAutoLocate}
                            disabled={locating}
                            style={({ pressed }) => [
                              styles.autoDetectBtn,
                              {
                                backgroundColor: theme.colors.orangeDim,
                                borderColor: orange,
                                opacity: locating ? 0.7 : pressed ? 0.8 : 1,
                              },
                            ]}
                          >
                            {locating ? (
                              <ActivityIndicator size="small" color={orange} />
                            ) : (
                              <Ionicons
                                name="navigate-outline"
                                size={16}
                                color={orange}
                              />
                            )}
                            <AppText
                              style={{
                                fontFamily:
                                  theme.fonts?.bodySemiBold ||
                                  "DMSans_600SemiBold",
                                fontSize: rem(0.8),
                                fontWeight: "600",
                                color: orange,
                                marginLeft: 6,
                              }}
                            >
                              {locating
                                ? t("retainedStaff.locating")
                                : t("retainedStaff.autoDetect")}
                            </AppText>
                          </Pressable>
                        </View>
                        {form.latitude && form.longitude ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 8,
                            }}
                          >
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={12}
                              color={green}
                            />
                            <AppText
                              style={{
                                fontFamily:
                                  theme.fonts?.body || "DMSans_400Regular",
                                fontSize: rem(0.7),
                                color: green,
                              }}
                            >
                              {t("retainedStaff.gpsCaptured", {
                                lat: form.latitude.toFixed(5),
                                lng: form.longitude.toFixed(5),
                              })}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    <Field
                      label={t("retainedStaff.employeeNumber")}
                      value={form.employeeNumber}
                      onChangeText={(v) =>
                        setForm({ ...form, employeeNumber: v })
                      }
                      placeholder={t("retainedStaff.employeeNumberPlaceholder")}
                      theme={theme}
                      rem={rem}
                    />
                    <Field
                      label={t("retainedStaff.roleDescription")}
                      value={form.description}
                      onChangeText={(v) => setForm({ ...form, description: v })}
                      placeholder={t(
                        "retainedStaff.roleDescriptionPlaceholder",
                      )}
                      multiline
                      full
                      theme={theme}
                      rem={rem}
                    />
                  </View>

                  {/* ── Section: Compensation ── */}
                  <SectionTitle
                    text={t("retainedStaff.compensation")}
                    theme={theme}
                    rem={rem}
                  />
                  <View
                    style={[styles.formGrid, isNarrow && styles.formGridSingle]}
                  >
                    <Field
                      label={t("retainedStaff.payRate")}
                      required
                      keyboardType="decimal-pad"
                      value={form.payRate}
                      onChangeText={(v) => setForm({ ...form, payRate: v })}
                      placeholder="0.00"
                      theme={theme}
                      rem={rem}
                    />
                    <SelectField
                      label={t("retainedStaff.currency")}
                      value={form.currency}
                      options={CURRENCIES.map((c) => ({
                        value: c,
                        label: c,
                      }))}
                      onChange={(v) => setForm({ ...form, currency: v })}
                      theme={theme}
                      rem={rem}
                    />
                    <SelectField
                      label={t("retainedStaff.payFrequency")}
                      value={form.payFrequency}
                      options={PAY_FREQUENCIES.map((o) => ({
                        value: o.value,
                        label: t(`retainedStaff.${o.key}`),
                      }))}
                      onChange={(v) => setForm({ ...form, payFrequency: v })}
                      theme={theme}
                      rem={rem}
                    />
                    <Field
                      label={t("retainedStaff.overtimeRate")}
                      keyboardType="decimal-pad"
                      value={form.overtimeRate}
                      onChangeText={(v) =>
                        setForm({ ...form, overtimeRate: v })
                      }
                      placeholder="0.00"
                      theme={theme}
                      rem={rem}
                    />
                  </View>

                  {/* ── Section: Schedule ── */}
                  <SectionTitle
                    text={t("retainedStaff.workingSchedule")}
                    theme={theme}
                    rem={rem}
                  />
                  <View style={{ marginBottom: 8 }}>
                    <AppText
                      style={{
                        fontFamily:
                          theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                        fontSize: rem(0.75),
                        fontWeight: "600",
                        color: textDim,
                        textTransform: "uppercase",
                        letterSpacing: 0.05 * rem(0.75),
                        marginBottom: 6,
                      }}
                    >
                      {t("retainedStaff.workDays")}
                    </AppText>
                    <View style={styles.daysRow}>
                      {WORK_DAYS.map((d) => {
                        const active = form.workDays.includes(d.value);
                        return (
                          <Pressable
                            key={d.value}
                            onPress={() => toggleWorkDay(d.value)}
                            style={({ pressed }) => [
                              styles.dayBtn,
                              {
                                backgroundColor: active ? orange : inputBg,
                                borderColor: active ? orange : inputBorder,
                                opacity: pressed ? 0.85 : 1,
                              },
                            ]}
                          >
                            <AppText
                              style={{
                                fontFamily:
                                  theme.fonts?.bodySemiBold ||
                                  "DMSans_600SemiBold",
                                fontSize: rem(0.8),
                                fontWeight: "600",
                                color: active ? "#fff" : textDim,
                              }}
                            >
                              {t(`retainedStaff.${d.key}`)}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <View
                    style={[styles.formGrid, isNarrow && styles.formGridSingle]}
                  >
                    <Field
                      label={t("retainedStaff.startTime")}
                      value={form.workStart}
                      onChangeText={(v) => setForm({ ...form, workStart: v })}
                      placeholder="09:00"
                      theme={theme}
                      rem={rem}
                    />
                    <Field
                      label={t("retainedStaff.endTime")}
                      value={form.workEnd}
                      onChangeText={(v) => setForm({ ...form, workEnd: v })}
                      placeholder="17:00"
                      theme={theme}
                      rem={rem}
                    />
                  </View>

                  {/* ── Section: HR ── */}
                  <SectionTitle
                    text={t("retainedStaff.hrInformation")}
                    theme={theme}
                    rem={rem}
                  />
                  <View
                    style={[styles.formGrid, isNarrow && styles.formGridSingle]}
                  >
                    <Field
                      label={t("retainedStaff.manager")}
                      value={form.managerName}
                      onChangeText={(v) => setForm({ ...form, managerName: v })}
                      placeholder={t("retainedStaff.managerPlaceholder")}
                      theme={theme}
                      rem={rem}
                    />
                    <Field
                      label={t("retainedStaff.emergencyContact")}
                      value={form.emergencyContact}
                      onChangeText={(v) =>
                        setForm({ ...form, emergencyContact: v })
                      }
                      placeholder={t(
                        "retainedStaff.emergencyContactPlaceholder",
                      )}
                      keyboardType="phone-pad"
                      theme={theme}
                      rem={rem}
                    />
                    <Field
                      label={t("retainedStaff.internalNotes")}
                      value={form.notes}
                      onChangeText={(v) => setForm({ ...form, notes: v })}
                      placeholder={t("retainedStaff.internalNotesPlaceholder")}
                      multiline
                      full
                      theme={theme}
                      rem={rem}
                    />
                  </View>
                </ScrollView>

                {/* ── Footer ── */}
                <View
                  style={[
                    styles.footer,
                    { borderTopColor: theme.colors.border },
                  ]}
                >
                  <Pressable
                    onPress={onClose}
                    disabled={submitting}
                    style={({ pressed }) => [
                      styles.cancelBtn,
                      {
                        borderColor: pressed
                          ? theme.colors.borderHover
                          : theme.colors.border,
                        opacity: submitting ? 0.5 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontFamily:
                          theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                        fontSize: rem(0.85),
                        fontWeight: "600",
                        color: textDim,
                      }}
                    >
                      {t("retainedStaff.cancelBtn")}
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={submitting}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      {
                        backgroundColor: pressed
                          ? theme.colors.orangeHover
                          : orange,
                        opacity: submitting ? 0.6 : 1,
                      },
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#fff"
                      />
                    )}
                    <AppText
                      style={{
                        fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                        fontSize: rem(0.85),
                        fontWeight: "700",
                        color: "#fff",
                        marginLeft: 6,
                      }}
                    >
                      {submitting
                        ? t("retainedStaff.adding")
                        : t("retainedStaff.addToStaff")}
                    </AppText>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Section title ────────────────────────────────────────────
function SectionTitle({ text, theme, rem }) {
  return (
    <AppText
      style={{
        fontFamily: theme.fonts?.display || "Syne_700Bold",
        fontSize: rem(0.95),
        lineHeight: rem(0.95) * 1.2,
        fontWeight: "700",
        color: theme.colors.orange,
        textTransform: "uppercase",
        letterSpacing: 0.06 * rem(0.95),
        marginTop: rem(1.5),
        marginBottom: rem(0.75),
      }}
    >
      {text}
    </AppText>
  );
}

// ─── Field ────────────────────────────────────────────────────
function Field({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  full,
  theme,
  rem,
}) {
  return (
    <View
      style={{
        width: full ? "100%" : undefined,
        flex: full ? undefined : 1,
        marginBottom: 8,
      }}
    >
      <AppText
        style={{
          fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
          fontSize: rem(0.75),
          fontWeight: "600",
          color: theme.colors.textDim,
          textTransform: "uppercase",
          letterSpacing: 0.05 * rem(0.75),
          marginBottom: 6,
        }}
      >
        {label}
        {required ? (
          <AppText style={{ color: theme.colors.red }}> *</AppText>
        ) : null}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        style={{
          backgroundColor: theme.colors.bgInput,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          color: theme.colors.text,
          fontFamily: theme.fonts?.body || "DMSans_400Regular",
          fontSize: rem(0.9),
          minHeight: multiline ? 60 : 42,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

// ─── SelectField ──────────────────────────────────────────────
// RN has no native <select>. Options open in a tiny modal sheet.
function SelectField({ label, value, options, onChange, theme, rem }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ flex: 1, marginBottom: 8 }}>
      <AppText
        style={{
          fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
          fontSize: rem(0.75),
          fontWeight: "600",
          color: theme.colors.textDim,
          textTransform: "uppercase",
          letterSpacing: 0.05 * rem(0.75),
          marginBottom: 6,
        }}
      >
        {label}
      </AppText>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: theme.colors.bgInput,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 42,
        }}
      >
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: theme.fonts?.body || "DMSans_400Regular",
            fontSize: rem(0.9),
            color: theme.colors.text,
            flex: 1,
          }}
        >
          {current?.label || "—"}
        </AppText>
        <Ionicons
          name="chevron-down"
          size={16}
          color={theme.colors.textMuted}
        />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.bgPanel,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              width: "100%",
              maxWidth: 400,
              paddingVertical: 8,
            }}
          >
            {options.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor:
                    opt.value === value
                      ? theme.colors.orangeDim
                      : "transparent",
                }}
              >
                <AppText
                  style={{
                    fontFamily:
                      opt.value === value
                        ? theme.fonts?.bodySemiBold
                        : theme.fonts?.body,
                    fontSize: rem(0.9),
                    fontWeight: opt.value === value ? "600" : "400",
                    color:
                      opt.value === value
                        ? theme.colors.orange
                        : theme.colors.text,
                  }}
                >
                  {opt.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
  },
  kav: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
    maxWidth: 720,
    maxHeight: "90%",
    alignSelf: "center",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginTop: 16,
  },
  body: {
    padding: 24,
    paddingTop: 16,
  },
  searchWrap: {
    position: "relative",
    marginBottom: 16,
  },
  searchIcon: {
    position: "absolute",
    left: 16,
    top: 16,
    zIndex: 1,
  },
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingLeft: 44,
    paddingRight: 44,
    paddingVertical: 14,
  },
  searchSpinner: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  emailWrap: {
    flexDirection: "row",
    gap: 8,
  },
  emailInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emailBtn: {
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  selectedWorker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  changeBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: "auto",
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  formGridSingle: {
    flexDirection: "column",
  },
  locationInputWrap: {
    position: "relative",
  },
  inputBase: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingRight: 12,
  },
  autoDetectBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dayBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
