// src/components/RetainedStaff/UpcomingItem.js
//
// Ported from .upcomingItem / .upcomingAvatar / .upcomingInfo /
// .upcomingMeta / .upcomingName / .upcomingRole / .upcomingAmount /
// .upcomingDate in HirerRetainedStaff.module.css.

import React from "react";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

function formatMoney(amount, currency = "NGN") {
  if (amount == null) return "—";
  try {
    return `${currency} ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function UpcomingItem({ cycle, onPress }) {
  const { theme, fontScale } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width <= 480;

  const nameFs = 0.875 * 16 * fontScale;
  const roleFs = 0.72 * 16 * fontScale;
  const amountFs = 0.9 * 16 * fontScale;
  const dateFs = 0.7 * 16 * fontScale;

  const initial = (cycle?.workerName || "?")[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: theme.colors.bgCard,
          borderColor: pressed ? theme.colors.orange : theme.colors.border,
          borderWidth: 1,
        },
      ]}
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: theme.colors.orangeDim,
            borderRadius: 999,
          },
        ]}
      >
        <AppText
          style={{
            fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
            fontSize: 0.85 * 16 * fontScale,
            fontWeight: "700",
            color: theme.colors.orange,
          }}
        >
          {initial}
        </AppText>
      </View>

      <View style={styles.info}>
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
            fontSize: nameFs,
            lineHeight: nameFs * 1.3,
            fontWeight: "700",
            color: theme.colors.text,
          }}
        >
          {cycle?.workerName || "—"}
        </AppText>
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: theme.fonts?.body || "DMSans_400Regular",
            fontSize: roleFs,
            lineHeight: roleFs * 1.3,
            color: theme.colors.textDim,
            marginTop: 1,
          }}
        >
          {cycle?.jobTitle || "—"}
        </AppText>
      </View>

      <View style={[styles.meta, isCompact && styles.metaStacked]}>
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: theme.fonts?.displayBlack || "Syne_800ExtraBold",
            fontSize: amountFs,
            lineHeight: amountFs * 1.2,
            fontWeight: "800",
            color: theme.colors.orange,
            textAlign: isCompact ? "left" : "right",
          }}
        >
          {formatMoney(cycle?.amount, cycle?.currency)}
        </AppText>
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: theme.fonts?.body || "DMSans_400Regular",
            fontSize: dateFs,
            lineHeight: dateFs * 1.3,
            color: theme.colors.textMuted,
            marginTop: 1,
            textAlign: isCompact ? "left" : "right",
          }}
        >
          {formatDate(cycle?.nextCycleAt)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  meta: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  metaStacked: {
    width: "100%",
    alignItems: "flex-start",
    marginTop: 4,
  },
});
