import { Pressable, Text, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradientLR } from "../../constants/theme";

export default function GradientButton({
  title,
  onPress,
  disabled,
  style,
  iconLeft,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  iconLeft?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={style} className={`${disabled ? "opacity-50" : ""}`}>
      <LinearGradient
        colors={gradientLR}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        className="rounded-pill px-6 py-4 items-center justify-center"
      >
        <Text className="text-background font-semibold text-base">{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}
