import { Pressable, Text, ViewStyle } from "react-native";

export default function Button({
  title,
  onPress,
  style,
  variant = "ghost",
}: {
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: "ghost" | "solid";
}) {
  const cls =
    variant === "ghost"
      ? "rounded-pill px-6 py-4 items-center justify-center border border-border bg-transparent"
      : "rounded-pill px-6 py-4 items-center justify-center bg-surface2";
  return (
    <Pressable onPress={onPress} style={style} className={cls}>
      <Text className="text-text font-medium">{title}</Text>
    </Pressable>
  );
}
