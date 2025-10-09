import { View, ViewProps } from "react-native";

export default function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View className="bg-surface rounded-2xl p-5 border border-border shadow-card" style={style} {...rest}>
      {children}
    </View>
  );
}
