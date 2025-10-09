import { View, Text } from "react-native";

export default function MetricBar({
  title,
  sub,
  percent,
  color = "#B8FF47",
  tag,
}: {
  title: string;
  sub?: string;
  percent: number; // 0..100
  color?: string;
  tag?: { label: string; bg?: string };
}) {
  return (
    <View className="bg-surface rounded-2xl p-4 border border-border mb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-text font-medium">{title}</Text>
          {sub ? <Text className="text-text-muted text-xs mt-1">{sub}</Text> : null}
        </View>
        {tag ? (
          <View className="px-2 py-1 rounded-pill" style={{ backgroundColor: tag.bg ?? "#00FFE033" }}>
            <Text className="text-text text-xs">{tag.label}</Text>
          </View>
        ) : null}
      </View>
      <View className="h-2 w-full bg-surface2 rounded-pill mt-3 overflow-hidden">
        <View style={{ width: `${percent}%`, backgroundColor: color }} className="h-2 rounded-pill" />
      </View>
      <Text className="text-text-muted text-xs mt-2">{percent}%</Text>
    </View>
  );
}
