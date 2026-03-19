import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function MyPieces() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>My Pieces page</Text>
      <Link href="/">Back home</Link>
    </View>
  );
}
