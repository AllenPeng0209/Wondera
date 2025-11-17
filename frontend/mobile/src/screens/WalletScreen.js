import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserSettings, updateUserSettings } from '../storage/db';

const packages = [
  { id: '600', amount: 600, price: 6 },
  { id: '2000', amount: 2000, price: 18 },
  { id: '3500', amount: 3500, price: 30 },
  { id: '12000', amount: 12000, price: 98 },
];

export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState(null);
  const [selected, setSelected] = useState(packages[0]);

  useEffect(() => {
    async function load() {
      const data = await getUserSettings();
      setSettings(data);
    }
    load();
  }, []);

  const handleRecharge = async () => {
    if (!settings) return;
    const newBalance = (settings.currency_balance || 0) + selected.amount;
    await updateUserSettings({ currency_balance: newBalance });
    setSettings((prev) => ({ ...prev, currency_balance: newBalance }));
    Alert.alert('充值成功', `获得 ${selected.amount} 心动币`);
  };

  if (!settings) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text>加载中...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Math.max(insets.top - 8, 8) }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>心动币钱包</Text>
        <View style={{ width: 34 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>余额</Text>
          <Text style={styles.balanceValue}>{settings.currency_balance || 0}</Text>
        </View>

        <View style={styles.packageGrid}>
          {packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              style={[styles.packageCard, selected.id === pkg.id && styles.packageCardActive]}
              onPress={() => setSelected(pkg)}
            >
              <Text style={styles.packageAmount}>{pkg.amount} 枚</Text>
              <Text style={styles.packageBonus}>首充多赠 {pkg.amount / 6} 心动币</Text>
              <Text style={styles.packagePrice}>¥{pkg.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.rechargeButton} onPress={handleRecharge}>
          <Text style={styles.rechargeText}>立即充值 ¥{selected.price.toFixed(2)}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8fb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#f1d7de',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  balanceCard: {
    backgroundColor: '#ffeef4',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: {
    color: '#f093a4',
    fontSize: 14,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#f093a4',
    marginTop: 8,
  },
  packageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  packageCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f4d9e0',
  },
  packageCardActive: {
    borderColor: '#f093a4',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  packageAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  packageBonus: {
    fontSize: 12,
    color: '#f093a4',
    marginVertical: 6,
  },
  packagePrice: {
    fontSize: 14,
    color: '#f093a4',
    fontWeight: '700',
  },
  rechargeButton: {
    marginTop: 24,
    backgroundColor: '#f093a4',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  rechargeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
