import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/Colors";
import { supabase } from "../../lib/supabase";

interface AddMealModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string; // ← current calendar tab’s selected date
}

export default function AddMealModal({
  visible,
  onClose,
  selectedDate,
}: AddMealModalProps) {
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const uploadImage = async (file: ImagePicker.ImagePickerAsset) => {
    try {
      const fileExt = file.uri.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `meal-images/${fileName}`;

      // Convert image to blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("meal-images")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("meal-images")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error("Image upload failed:", error.message);
      Alert.alert("Upload Error", "Failed to upload image.");
      return null;
    }
  };

  const handleAddMeal = async () => {
    if (!mealName || !calories) {
      Alert.alert("Missing info", "Please enter meal name and calories.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Not signed in", "You need to be logged in to add a meal.");
        return;
      }

      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const { error } = await supabase.from("meals").insert([
        {
          user_id: user.id,
          name: mealName,
          calories: parseInt(calories),
          image_url: imageUrl,
          date: selectedDate, // ✅ store the date
          created_at: new Date(),
        },
      ]);

      if (error) {
        Alert.alert("Error adding meal", error.message);
      } else {
        Alert.alert("Success", "Meal added successfully!");
        setMealName("");
        setCalories("");
        setImage(null);
        onClose();
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 70}
          >
            <View
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                maxHeight: "75%",
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: colors.inputBorder,
                  borderRadius: 2,
                  alignSelf: "center",
                  marginBottom: 20,
                }}
              />

              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.textPrimary,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                Add Meal — {selectedDate}
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  placeholder="Meal name"
                  placeholderTextColor={colors.textSecondary}
                  value={mealName}
                  onChangeText={setMealName}
                  style={{
                    backgroundColor: colors.inputBg,
                    color: colors.textPrimary,
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 12,
                    fontSize: 16,
                  }}
                />

                <TextInput
                  placeholder="Calories"
                  placeholderTextColor={colors.textSecondary}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: colors.inputBg,
                    color: colors.textPrimary,
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 12,
                    fontSize: 16,
                  }}
                />

                <TouchableOpacity
                  onPress={pickImage}
                  style={{
                    backgroundColor: colors.inputBg,
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Ionicons
                    name="image-outline"
                    size={22}
                    color={colors.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 16,
                    }}
                  >
                    {image ? "Change Image" : "Upload Image"}
                  </Text>
                </TouchableOpacity>

                {image && (
                  <Image
                    source={{ uri: image.uri }}
                    style={{
                      width: "100%",
                      height: 160,
                      borderRadius: 10,
                      marginBottom: 16,
                    }}
                    resizeMode="cover"
                  />
                )}

                <TouchableOpacity
                  disabled={loading}
                  onPress={handleAddMeal}
                  style={{
                    backgroundColor: colors.accent,
                    padding: 16,
                    borderRadius: 50,
                    alignItems: "center",
                    marginBottom: Platform.OS === "ios" ? 20 : 10,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: 16,
                      }}
                    >
                      Add Meal
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  style={{ alignItems: "center", marginBottom: 30 }}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 15,
                      fontWeight: "500",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
