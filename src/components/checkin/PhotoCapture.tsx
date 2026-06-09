/**
 * PhotoCapture Component - Trainerize-style progress photo capture
 *
 * Flow: Pose reference card → Camera with alignment guides → Preview/confirm
 *
 * Features:
 * - Pose reference card with model illustration before camera opens
 * - Instructions modal on first use
 * - Alignment guide lines (eyes/hip horizontal, center vertical) with labels
 * - Front/back camera toggle (defaults to front for selfies)
 * - Pick from gallery option
 * - Ghost overlay from previous check-in photo
 * - Skip pose option
 */

import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { spacing, radius } from "@/src/theme";

export type PoseType = "front" | "side" | "back";

type PhotoCaptureProps = {
  pose: PoseType;
  userId: string;
  /** Previously captured photo URL for ghost overlay positioning guide */
  previousPhotoUrl?: string | null;
  /** Called with the uploaded photo URL on success */
  onCapture: (url: string) => void;
  /** Called when user wants to skip this pose */
  onSkip?: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CAMERA_HEIGHT = SCREEN_HEIGHT * 0.7;

// ---------------------------------------------------------------------------
// Pose config - labels, guide line labels, instructions
// ---------------------------------------------------------------------------
const POSE_CONFIG: Record<
  PoseType,
  {
    label: string;
    topGuideLabel: string;
    bottomGuideLabel: string;
    centerLabel: string;
    instruction: string;
  }
> = {
  front: {
    label: "Front",
    topGuideLabel: "Eyes",
    bottomGuideLabel: "Hip",
    centerLabel: "Nose",
    instruction: "Stand facing the camera, arms relaxed at your sides",
  },
  side: {
    label: "Side",
    topGuideLabel: "Eyes",
    bottomGuideLabel: "Hip",
    centerLabel: "Center of head",
    instruction: "Turn 90° to your left, stand naturally",
  },
  back: {
    label: "Back",
    topGuideLabel: "Ears",
    bottomGuideLabel: "Hip",
    centerLabel: "Center of head",
    instruction: "Face away from the camera, arms relaxed",
  },
};

// ---------------------------------------------------------------------------
// Instructions Modal (shown before first capture)
// ---------------------------------------------------------------------------
function InstructionsModal({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={instructionStyles.backdrop}>
        <View
          style={[instructionStyles.card, { backgroundColor: colors.card }]}
        >
          <View style={instructionStyles.header}>
            <Text
              allowFontScaling={false}
              style={[instructionStyles.title, { color: colors.text }]}
            >
              INSTRUCTIONS
            </Text>
            <Pressable onPress={onDismiss} hitSlop={12}>
              <Ionicons
                name="close-circle-outline"
                size={24}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <Text
            allowFontScaling={false}
            style={[instructionStyles.sectionTitle, { color: colors.text }]}
          >
            For Best Progress Photos
          </Text>

          <Text
            allowFontScaling={false}
            style={[instructionStyles.label, { color: colors.text }]}
          >
            Clothes
          </Text>
          <Text
            allowFontScaling={false}
            style={[
              instructionStyles.body,
              { color: colors.textSecondary },
            ]}
          >
            Wear swimwear or athletic clothing to see your body change
          </Text>

          <Text
            allowFontScaling={false}
            style={[instructionStyles.label, { color: colors.text }]}
          >
            Backdrop
          </Text>
          <Text
            allowFontScaling={false}
            style={[
              instructionStyles.body,
              { color: colors.textSecondary },
            ]}
          >
            Stand against a white wall or a plain background
          </Text>

          <Text
            allowFontScaling={false}
            style={[instructionStyles.label, { color: colors.text }]}
          >
            Pose Naturally
          </Text>
          <Text
            allowFontScaling={false}
            style={[
              instructionStyles.body,
              { color: colors.textSecondary },
            ]}
          >
            Don&apos;t suck in or push out
          </Text>

          <Text
            allowFontScaling={false}
            style={[
              instructionStyles.bodySmall,
              { color: colors.textSecondary },
            ]}
          >
            We&apos;ll take 3 photos from different angles today. You can compare
            them side by side as you get fitter.
          </Text>

          <Text
            allowFontScaling={false}
            style={[
              instructionStyles.notice,
              { color: colors.primary },
            ]}
          >
            Photos are stored securely and only visible to you and your coach.
          </Text>

          <Pressable
            onPress={onDismiss}
            style={[
              instructionStyles.startButton,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text
              allowFontScaling={false}
              style={[
                instructionStyles.startButtonText,
                { color: colors.textOnPrimary },
              ]}
            >
              Ok, let&apos;s start
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const instructionStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
  },
  notice: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  startButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

// ---------------------------------------------------------------------------
// Alignment Guide Overlay - lines + labels like Trainerize
// ---------------------------------------------------------------------------
function AlignmentGuide({ pose }: { pose: PoseType }) {
  const config = POSE_CONFIG[pose];

  return (
    <View style={guideStyles.container} pointerEvents="none">
      {/* Pose label - top left */}
      <Text allowFontScaling={false} style={guideStyles.poseLabel}>
        {config.label}
      </Text>

      {/* Center label - top center */}
      <Text allowFontScaling={false} style={guideStyles.centerLabel}>
        {config.centerLabel}
      </Text>

      {/* Vertical center line */}
      <View style={guideStyles.verticalLine} />

      {/* Top horizontal guide (eyes/ears) - about 18% from top */}
      <View style={[guideStyles.horizontalLine, { top: "18%" }]} />
      <Text
        allowFontScaling={false}
        style={[guideStyles.guideLabel, { top: "16%" }]}
      >
        {config.topGuideLabel}
      </Text>

      {/* Bottom horizontal guide (hip) - about 55% from top */}
      <View style={[guideStyles.horizontalLine, { top: "55%" }]} />
      <Text
        allowFontScaling={false}
        style={[guideStyles.guideLabel, { top: "53%" }]}
      >
        {config.bottomGuideLabel}
      </Text>
    </View>
  );
}

const guideStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  poseLabel: {
    position: "absolute",
    top: 12,
    left: 14,
    color: "#FFD60A",
    fontSize: 16,
    fontWeight: "700",
  },
  centerLabel: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    left: "50%",
    transform: [{ translateX: -40 }],
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "500",
    width: 120,
    textAlign: "center",
  },
  verticalLine: {
    position: "absolute",
    left: "50%",
    top: "6%",
    bottom: "12%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  horizontalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  guideLabel: {
    position: "absolute",
    left: 14,
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "500",
  },
});

// ---------------------------------------------------------------------------
// Camera Controls Bar (bottom)
// ---------------------------------------------------------------------------
function CameraControls({
  onCapture,
  onCancel,
  onFlip,
  onGhostToggle,
  onPickGallery,
  ghostEnabled,
  capturing,
}: {
  onCapture: () => void;
  onCancel: () => void;
  onFlip: () => void;
  onGhostToggle?: () => void;
  onPickGallery: () => void;
  ghostEnabled: boolean;
  capturing: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={controlStyles.container}>
      {/* Top row: Cancel */}
      <View style={controlStyles.topRow}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text
            allowFontScaling={false}
            style={controlStyles.cancelText}
          >
            Cancel
          </Text>
        </Pressable>
      </View>

      {/* Bottom row: capture button + side icons */}
      <View style={controlStyles.bottomRow}>
        {/* Shutter button */}
        <Pressable
          onPress={onCapture}
          disabled={capturing}
          style={controlStyles.shutterOuter}
        >
          <View
            style={[
              controlStyles.shutterInner,
              capturing && { backgroundColor: "#999" },
            ]}
          />
        </Pressable>

        {/* Right-side icons */}
        <View style={controlStyles.rightIcons}>
          {/* Ghost overlay toggle */}
          {onGhostToggle && (
            <Pressable onPress={onGhostToggle} style={controlStyles.iconBtn}>
              <Ionicons
                name="timer-outline"
                size={22}
                color={ghostEnabled ? "#FFD60A" : "#fff"}
              />
            </Pressable>
          )}

          {/* Flip camera */}
          <Pressable onPress={onFlip} style={controlStyles.iconBtn}>
            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
          </Pressable>

          {/* Pick from gallery */}
          <Pressable onPress={onPickGallery} style={controlStyles.iconBtn}>
            <Ionicons name="grid-outline" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const controlStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 36,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  topRow: {
    flexDirection: "row",
    paddingTop: 10,
    paddingBottom: 12,
  },
  cancelText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
  rightIcons: {
    position: "absolute",
    right: 0,
    flexDirection: "column",
    gap: 16,
    alignItems: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ---------------------------------------------------------------------------
// Pose Reference Card - shown before camera opens
// ---------------------------------------------------------------------------
function PoseReferenceCard({
  pose,
  onTakeNow,
  onPickPhoto,
  onSkip,
}: {
  pose: PoseType;
  onTakeNow: () => void;
  onPickPhoto: () => void;
  onSkip?: () => void;
}) {
  const { colors } = useTheme();
  const config = POSE_CONFIG[pose];

  return (
    <View style={refStyles.container}>
      <View style={[refStyles.card, { backgroundColor: colors.card }]}>
        {/* Pose label */}
        <Text
          allowFontScaling={false}
          style={[refStyles.poseLabel, { color: colors.text }]}
        >
          {config.label}
        </Text>

        {/* Placeholder illustration area */}
        <View
          style={[
            refStyles.illustrationArea,
            { backgroundColor: colors.bgSecondary },
          ]}
        >
          {/* Guide line labels */}
          <View style={[refStyles.guideLine, { top: "15%" }]}>
            <View
              style={[refStyles.lineBar, { backgroundColor: colors.border }]}
            />
            <Text
              allowFontScaling={false}
              style={[refStyles.lineLabel, { color: colors.textMuted }]}
            >
              {config.topGuideLabel}
            </Text>
          </View>

          {/* Body icon */}
          <Ionicons
            name={
              pose === "side" ? "person-outline" : "body-outline"
            }
            size={80}
            color={colors.textMuted}
            style={{ alignSelf: "center", marginTop: 20 }}
          />

          <View style={[refStyles.guideLine, { bottom: "18%" }]}>
            <View
              style={[refStyles.lineBar, { backgroundColor: colors.border }]}
            />
            <Text
              allowFontScaling={false}
              style={[refStyles.lineLabel, { color: colors.textMuted }]}
            >
              {config.bottomGuideLabel}
            </Text>
          </View>
        </View>

        <Text
          allowFontScaling={false}
          style={[refStyles.instruction, { color: colors.textSecondary }]}
        >
          Take consistent photos{"\n"}by using the guiding lines.
        </Text>

        {/* Action buttons */}
        <View style={refStyles.actions}>
          <Pressable onPress={onPickPhoto} style={refStyles.actionBtn}>
            <Text
              allowFontScaling={false}
              style={[refStyles.actionText, { color: colors.primary }]}
            >
              PICK PHOTO
            </Text>
          </Pressable>
          <Pressable onPress={onTakeNow} style={refStyles.actionBtn}>
            <Text
              allowFontScaling={false}
              style={[refStyles.actionText, { color: colors.primary }]}
            >
              TAKE NOW
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Skip this pose */}
      {onSkip && (
        <Pressable onPress={onSkip} style={refStyles.skipBtn}>
          <Text
            allowFontScaling={false}
            style={[refStyles.skipText, { color: colors.text }]}
          >
            SKIP THIS POSE
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const refStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 16,
    overflow: "hidden",
  },
  poseLabel: {
    fontSize: 18,
    fontWeight: "600",
    padding: 16,
    paddingBottom: 8,
  },
  illustrationArea: {
    width: "100%",
    height: 220,
    justifyContent: "center",
    position: "relative",
  },
  guideLine: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  lineBar: {
    flex: 1,
    height: 1,
  },
  lineLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginLeft: 6,
  },
  instruction: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  skipBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
export function PhotoCapture({
  pose,
  userId,
  previousPhotoUrl,
  onCapture,
  onSkip,
}: PhotoCaptureProps) {
  const { colors } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // State
  const [mode, setMode] = useState<"reference" | "camera" | "preview">("reference");
  const [showInstructions, setShowInstructions] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<"front" | "back">("front");
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ghostEnabled, setGhostEnabled] = useState(true);

  // --- Process image (resize + compress) ---
  const processImage = useCallback(async (uri: string): Promise<string> => {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipulated.uri;
  }, []);

  // --- Take picture ---
  const takePicture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error("Failed to capture photo");
      const processed = await processImage(photo.uri);
      setPreview(processed);
      setMode("preview");
    } catch (err) {
      console.error("Photo capture error:", err);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    } finally {
      setCapturing(false);
    }
  }, [capturing, processImage]);

  // --- Pick from gallery ---
  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (!result.canceled && result.assets[0]) {
      const processed = await processImage(result.assets[0].uri);
      setPreview(processed);
      setMode("preview");
    }
  }, [processImage]);

  // --- Retake ---
  const retake = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreview(null);
    setMode("camera");
  }, []);

  // --- Confirm + upload ---
  const confirmAndUpload = useCallback(async () => {
    if (!preview) return;
    setUploading(true);

    try {
      const timestamp = Date.now();
      const filePath = `checkins/${userId}/${timestamp}_${pose}.jpg`;

      const response = await fetch(preview);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("check-in-photos")
        .upload(filePath, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("check-in-photos")
        .getPublicUrl(filePath);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCapture(urlData.publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Upload Failed", "Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }, [preview, userId, pose, onCapture]);

  // --- Open camera (request permission first) ---
  const openCamera = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Access Needed",
          "Please enable camera access in Settings to take progress photos."
        );
        return;
      }
    }
    setMode("camera");
  }, [permission, requestPermission]);

  // --- Flip camera ---
  const flipCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraFacing((prev) => (prev === "front" ? "back" : "front"));
  }, []);

  // =========================================================================
  // RENDER: Instructions Modal (first time)
  // =========================================================================
  if (mode === "reference" && showInstructions) {
    return (
      <>
        <PoseReferenceCard
          pose={pose}
          onTakeNow={openCamera}
          onPickPhoto={pickFromGallery}
          onSkip={onSkip}
        />
        <InstructionsModal
          visible={showInstructions}
          onDismiss={() => setShowInstructions(false)}
        />
      </>
    );
  }

  // =========================================================================
  // RENDER: Pose Reference Card
  // =========================================================================
  if (mode === "reference") {
    return (
      <PoseReferenceCard
        pose={pose}
        onTakeNow={openCamera}
        onPickPhoto={pickFromGallery}
        onSkip={onSkip}
      />
    );
  }

  // =========================================================================
  // RENDER: Preview - confirm or retake
  // =========================================================================
  if (mode === "preview" && preview) {
    return (
      <View style={styles.fullScreen}>
        <Image
          source={{ uri: preview }}
          style={styles.previewImage}
          resizeMode="cover"
        />

        <View style={styles.previewOverlay}>
          <Text allowFontScaling={false} style={styles.previewLabel}>
            {POSE_CONFIG[pose].label} - Review
          </Text>
        </View>

        <View
          style={[styles.previewActions, { backgroundColor: colors.bg }]}
        >
          <Pressable
            onPress={retake}
            style={[styles.retakeButton, { borderColor: colors.border }]}
            disabled={uploading}
          >
            <Ionicons name="refresh" size={20} color={colors.text} />
            <Text
              allowFontScaling={false}
              style={[styles.actionButtonText, { color: colors.text }]}
            >
              Retake
            </Text>
          </Pressable>

          <Pressable
            onPress={confirmAndUpload}
            style={[
              styles.confirmButton,
              { backgroundColor: colors.primary },
            ]}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <>
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={colors.textOnPrimary}
                />
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.actionButtonText,
                    { color: colors.textOnPrimary },
                  ]}
                >
                  Use Photo
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // =========================================================================
  // RENDER: Camera with alignment guides
  // =========================================================================
  return (
    <View style={styles.fullScreen}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={cameraFacing}
      >
        {/* Alignment guide lines */}
        <AlignmentGuide pose={pose} />

        {/* Ghost overlay from previous photo */}
        {previousPhotoUrl && ghostEnabled && (
          <Image
            source={{ uri: previousPhotoUrl }}
            style={styles.ghostOverlay}
            resizeMode="cover"
          />
        )}
      </CameraView>

      {/* Camera controls */}
      <CameraControls
        onCapture={takePicture}
        onCancel={() => setMode("reference")}
        onFlip={flipCamera}
        onPickGallery={pickFromGallery}
        onGhostToggle={previousPhotoUrl ? () => setGhostEnabled((p) => !p) : undefined}
        ghostEnabled={ghostEnabled}
        capturing={capturing}
      />
    </View>
  );
}

// ===========================================================================
// STYLES
// ===========================================================================
const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: "#000",
  },
  // Ghost overlay
  ghostOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  // Preview
  previewImage: {
    flex: 1,
  },
  previewOverlay: {
    position: "absolute",
    top: spacing.base,
    left: spacing.base,
  },
  previewLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  previewActions: {
    flexDirection: "row",
    padding: spacing.lg,
    gap: spacing.md,
  },
  retakeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
