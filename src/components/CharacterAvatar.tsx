import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Character } from '../models/Character';

interface Props {
  character: Character;
  size?: number;
}

export function CharacterAvatar({ character, size = 52 }: Props) {
  const color = character.themeColor ?? '#7D3BDD';
  const initial = character.companyName?.[0] ?? '?';

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '26',
          borderColor: color + '66',
        },
      ]}
    >
      <Text style={[styles.initial, { color, fontSize: size * 0.42 }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontWeight: 'bold' },
});
