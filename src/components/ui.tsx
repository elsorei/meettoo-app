/**
 * Piccola libreria di componenti condivisi: bottone primario, input di form,
 * testo d'errore. Un posto solo per stile e stati (loading/disabled), così le
 * schermate non duplicano più gli stessi StyleSheet.
 */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';

import { colors, spacing } from '../theme';

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
}) {
  const stylesByVariant = {
    primary: [styles.button, styles.buttonPrimary],
    danger: [styles.button, styles.buttonDanger],
    ghost: [styles.button, styles.buttonGhost],
  } as const;
  const textByVariant = {
    primary: styles.buttonText,
    danger: styles.buttonText,
    ghost: styles.buttonGhostText,
  } as const;

  return (
    <TouchableOpacity
      style={[stylesByVariant[variant], (disabled || loading) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.primary : colors.textOnDark} />
      ) : (
        <Text style={textByVariant[variant]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function FormInput({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor={colors.textDim}
        accessibilityLabel={label}
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function ErrorBox({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorBoxText}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonDanger: { backgroundColor: colors.danger },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: colors.textOnDark,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonGhostText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  field: { marginTop: spacing.sm },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 13, marginTop: 4 },
  errorBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  errorBoxText: { color: colors.danger, fontSize: 15, textAlign: 'center' },
});
