import { View, Text, Switch } from "react-native";
import { useState } from "react";

export default function ToggleRow({
  label,
  helper,
  initial = false,
  onChange,
}: {
  label: string;
  helper?: string;
  initial?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <View className="flex-row items-center justify-between py-4">
      <View className="flex-1 pr-3">
        <Text className="text-text font-medium">{label}</Text>
        {helper ? <Text className="text-text-muted text-xs mt-1">{helper}</Text> : null}
      </View>
      <Switch
        trackColor={{ false: "#2A2A2A", true: "#1A1A1A" }}
        thumbColor={v ? "#B8FF47" : "#888"}
        onValueChange={(nv) => {
          setV(nv);
          onChange?.(nv);
        }}
        value={v}
      />
    </View>
  );
}
