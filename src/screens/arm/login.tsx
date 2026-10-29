import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Icon } from '@/components/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useArm } from '@/state/arm';

import { armStyles, BarraArm, Boton } from './ui';

/** Acceso de asesores al panel ARM (Supabase Auth con correo y contraseña). */
export function LoginAsesor() {
  const c = useTheme();
  const { iniciarSesion } = useArm();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrar = async () => {
    if (!email.trim() || !clave) {
      setError('Escribe tu correo y tu contraseña.');
      return;
    }
    setEnviando(true);
    setError(null);
    const e = await iniciarSesion(email, clave);
    setEnviando(false);
    if (e) setError(e);
  };

  const campo = [styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.border }];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BarraArm subtitulo="ARM · Brisa gestiona tus clientes" titulo="Acceso de asesores" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[armStyles.contenido, { maxWidth: 440 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.icono, { backgroundColor: c.primarySoft }]}>
            <Icon name="chispa" size={26} color={c.primary} />
          </View>
          <Text style={[styles.texto, { color: c.textSecondary }]}>
            Entra con la cuenta que te dio el administrador de tu inmobiliaria. Solo verás los clientes de tu
            inmobiliaria.
          </Text>
          <View style={{ gap: Spacing.three - 4 }}>
            <View style={{ gap: 6 }}>
              <Text style={[styles.label, { color: c.text }]}>Correo</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="asesor@tuinmobiliaria.com"
                placeholderTextColor={c.textSecondary}
                style={campo}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={[styles.label, { color: c.text }]}>Contraseña</Text>
              <TextInput
                value={clave}
                onChangeText={setClave}
                secureTextEntry
                autoComplete="password"
                placeholder="••••••••"
                placeholderTextColor={c.textSecondary}
                style={campo}
                onSubmitEditing={entrar}
                returnKeyType="go"
              />
            </View>
            {error && <Text style={[styles.error, { color: c.accent }]}>{error}</Text>}
            {enviando ? <ActivityIndicator color={c.primary} /> : <Boton texto="Entrar" onPress={entrar} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  icono: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  texto: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '700' },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: Spacing.three - 2,
    fontSize: 16,
  },
  error: { fontSize: 14, fontWeight: '600' },
});
