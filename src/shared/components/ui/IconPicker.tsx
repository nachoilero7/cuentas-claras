import { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/src/core/providers/ThemeProvider';
import { spacing, borderRadius } from '@/src/shared/theme';

// ── Iconos curados por categoria ────────────────────────────────────────────

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconGroup {
  label: string;
  icons: IconName[];
}

const ICON_GROUPS: IconGroup[] = [
  {
    label: 'Alimentacion',
    icons: [
      'food-fork-drink',
      'food-apple',
      'coffee',
      'pizza',
      'silverware-fork-knife',
      'cup',
      'beer',
      'ice-cream',
      'fruit-grapes',
      'food',
    ],
  },
  {
    label: 'Transporte',
    icons: [
      'car',
      'bus',
      'train',
      'airplane',
      'bicycle',
      'gas-station',
      'taxi',
      'motorbike',
      'ferry',
      'parking',
    ],
  },
  {
    label: 'Hogar',
    icons: [
      'home',
      'lightbulb',
      'water',
      'flash',
      'sofa',
      'bed',
      'washing-machine',
      'fridge',
      'broom',
      'tools',
    ],
  },
  {
    label: 'Salud',
    icons: [
      'hospital-building',
      'pill',
      'heart-pulse',
      'stethoscope',
      'medical-bag',
      'tooth',
      'eye',
      'bandage',
      'needle',
      'mortar-pestle-plus',
    ],
  },
  {
    label: 'Educacion',
    icons: [
      'school',
      'book-open-page-variant',
      'pencil',
      'school-outline',
      'notebook',
      'calculator',
      'monitor',
      'bookshelf',
      'translate',
      'certificate',
    ],
  },
  {
    label: 'Deportes',
    icons: [
      'basketball',
      'soccer',
      'trophy',
      'dumbbell',
      'run',
      'swim',
      'tennis',
      'volleyball',
      'weight-lifter',
      'shoe-sneaker',
    ],
  },
  {
    label: 'Entretenimiento',
    icons: [
      'movie-open',
      'gamepad-variant',
      'music',
      'palette',
      'theater',
      'television',
      'guitar-acoustic',
      'headphones',
      'camera',
      'party-popper',
    ],
  },
  {
    label: 'Compras',
    icons: [
      'shopping',
      'cart',
      'store',
      'gift',
      'tag',
      'basket',
      'hanger',
      'tshirt-crew',
      'shoe-formal',
      'ring',
    ],
  },
  {
    label: 'Finanzas',
    icons: [
      'bank',
      'credit-card',
      'cash',
      'wallet',
      'chart-line',
      'piggy-bank',
      'hand-coin',
      'currency-usd',
      'safe',
      'receipt',
    ],
  },
  {
    label: 'Trabajo',
    icons: [
      'briefcase',
      'laptop',
      'phone',
      'printer',
      'office-building',
      'account-tie',
      'file-document',
      'email',
      'calendar',
      'clock-outline',
    ],
  },
  {
    label: 'Otros',
    icons: [
      'dots-horizontal',
      'folder',
      'star',
      'flag',
      'wrench',
      'shield',
      'leaf',
      'paw',
      'baby-carriage',
      'account-group',
    ],
  },
];

const ALL_ICONS = ICON_GROUPS.flatMap((g) => g.icons);

// ── Props ────────────────────────────────────────────────────────────────────

export interface IconPickerProps {
  value: string;
  onSelect: (iconName: string) => void;
  label?: string;
  error?: string;
}

// ── Componente ──────────────────────────────────────────────────────────────

export function IconPicker({ value, onSelect, label = 'Icono', error }: IconPickerProps) {
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return ICON_GROUPS;
    const q = search.toLowerCase().trim();
    const filtered: IconGroup[] = [];
    for (const group of ICON_GROUPS) {
      const matching = group.icons.filter((icon) => icon.includes(q));
      if (matching.length > 0) {
        filtered.push({ label: group.label, icons: matching });
      }
    }
    return filtered;
  }, [search]);

  const handleSelect = useCallback(
    (iconName: string) => {
      onSelect(iconName);
      setVisible(false);
      setSearch('');
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    onSelect('');
    setVisible(false);
    setSearch('');
  }, [onSelect]);

  const isValidIcon = value.trim() !== '' && ALL_ICONS.includes(value as IconName);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text
          variant="labelLarge"
          style={{ color: error ? colors.error : colors.textSecondary, marginBottom: spacing.xs }}
        >
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setVisible(true)}
        style={[
          styles.selector,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: error ? colors.error : colors.outline,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Seleccionar icono. Actual: ${value || 'ninguno'}`}
      >
        <View style={styles.selectorLeft}>
          {isValidIcon ? (
            <MaterialCommunityIcons
              name={value as IconName}
              size={24}
              color={colors.primary}
            />
          ) : (
            <MaterialCommunityIcons
              name="shape-outline"
              size={24}
              color={colors.textTertiary}
            />
          )}
          <Text
            variant="bodyLarge"
            style={{
              color: value ? colors.text : colors.textTertiary,
              marginLeft: spacing.smd,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {value || 'Seleccionar icono...'}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={colors.textTertiary}
        />
      </Pressable>

      {error ? (
        <Text variant="bodySmall" style={{ color: colors.error, marginTop: spacing.xxs }}>
          {error}
        </Text>
      ) : null}

      {/* ── Modal del picker ──────────────────────────────────────── */}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setVisible(false); setSearch(''); }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.outline }]}>
            <Pressable onPress={() => { setVisible(false); setSearch(''); }} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text variant="titleMedium" style={{ color: colors.text, fontWeight: '700', flex: 1, textAlign: 'center' }}>
              Seleccionar Icono
            </Text>
            <Pressable onPress={handleClear} hitSlop={8}>
              <Text variant="labelMedium" style={{ color: colors.error }}>Limpiar</Text>
            </Pressable>
          </View>

          {/* Search bar */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surfaceVariant, borderColor: colors.outline },
            ]}
          >
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar icono..."
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>

          {/* Icon grid */}
          <ScrollView
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filteredIcons.length === 0 ? (
              <View style={styles.emptySearch}>
                <MaterialCommunityIcons name="magnify-close" size={48} color={colors.textTertiary} />
                <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: spacing.sm }}>
                  No se encontraron iconos
                </Text>
              </View>
            ) : (
              filteredIcons.map((group) => (
                <View key={group.label}>
                  <Text
                    variant="labelLarge"
                    style={[styles.groupLabel, { color: colors.textSecondary }]}
                  >
                    {group.label}
                  </Text>
                  <View style={styles.iconGrid}>
                    {group.icons.map((iconName) => {
                      const isSelected = iconName === value;
                      return (
                        <Pressable
                          key={iconName}
                          onPress={() => handleSelect(iconName)}
                          style={[
                            styles.iconCell,
                            {
                              backgroundColor: isSelected ? colors.primary + '1A' : colors.surface,
                              borderColor: isSelected ? colors.primary : 'transparent',
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={iconName}
                          accessibilityState={{ selected: isSelected }}
                        >
                          <MaterialCommunityIcons
                            name={iconName}
                            size={28}
                            color={isSelected ? colors.primary : colors.text}
                          />
                          <Text
                            variant="labelSmall"
                            style={{
                              color: isSelected ? colors.primary : colors.textTertiary,
                              marginTop: 2,
                              fontSize: 9,
                              textAlign: 'center',
                            }}
                            numberOfLines={1}
                          >
                            {iconName.replace(/-/g, ' ')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.xs,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.smd,
    height: 52,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginVertical: spacing.smd,
    paddingHorizontal: spacing.smd,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  gridContent: {
    paddingHorizontal: spacing.smd,
    paddingBottom: spacing.xl,
  },
  groupLabel: {
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  iconCell: {
    width: '18.5%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    minHeight: 68,
  },
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
});
