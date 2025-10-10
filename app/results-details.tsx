import React from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from "react-native";

export default function ResultsDetails() {
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={{flex:1}} contentContainerStyle={{padding:16}}>
        <Text style={s.h1}>Detailed Analysis</Text>
        <Text style={s.sub}>This screen will show the full breakdown by region, charts, posture metrics, and training suggestions.</Text>
        <View style={{height:20}} />
        <View style={s.card}><Text style={{color:"#DDE4E7"}}>Coming soon.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  h1: { color:"#fff", fontWeight:"800", fontSize:22 },
  sub: { color:"#9BA7AA", marginTop:6 },
  card: { backgroundColor:"#151515", borderRadius:16, padding:16, borderWidth:1, borderColor:"#243033" }
});
