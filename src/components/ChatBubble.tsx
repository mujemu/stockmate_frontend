import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Linking,
} from 'react-native';
import { ChatMessage, NewsItem } from '../models/ChatMessage';
import { Colors } from '../config/colors';

interface Props {
  message: ChatMessage;
  onAction?: (text: string) => void;
  actionChips?: string[];
  isLast?: boolean;
}

export function ChatBubble({ message, onAction, actionChips = [], isLast = false }: Props) {
  if (message.type === 'newsCards' && message.newsItems.length > 0) {
    return (
      <NewsCardsWidget
        items={message.newsItems}
        actionChips={isLast ? actionChips : []}
        onAction={onAction}
      />
    );
  }

  const isUser = message.role === 'user';
  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, isUser ? styles.textUser : styles.textBot]}>
          {message.content}
        </Text>
      </View>
      {!isUser && isLast && actionChips.length > 0 && (
        <ActionChips chips={actionChips} onTap={onAction} />
      )}
    </View>
  );
}

function ActionChips({ chips, onTap }: { chips: string[]; onTap?: (t: string) => void }) {
  return (
    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
      {chips.map((chip) => (
        <TouchableOpacity key={chip} onPress={() => onTap?.(chip)} style={styles.chip}>
          <Text style={styles.chipText}>{chip}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function NewsCardsWidget({
  items, actionChips, onAction,
}: {
  items: NewsItem[];
  actionChips: string[];
  onAction?: (t: string) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <View style={styles.newsWrap}>
      <Text style={styles.newsLabel}>최근 뉴스</Text>
      {items.map((item, i) => {
        const isOpen = expanded === i;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => setExpanded(isOpen ? null : i)}
            style={[styles.newsCard, isOpen && styles.newsCardOpen]}
          >
            <View style={styles.newsRow}>
              <Text style={styles.newsTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.newsDate}>{item.date}</Text>
              <Text style={styles.newsChevron}>{isOpen ? '▲' : '▼'}</Text>
            </View>
            {isOpen && item.description ? (
              <Text style={styles.newsDesc}>{item.description}</Text>
            ) : null}
            {isOpen && item.url ? (
              <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
                <Text style={styles.newsLink}>기사 보기 →</Text>
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
        );
      })}
      {actionChips.length > 0 && <ActionChips chips={actionChips} onTap={onAction} />}
    </View>
  );
}

export function ThinkingBubble() {
  return (
    <View style={styles.thinkingWrap}>
      <View style={styles.thinkingBubble}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 4 },
  rowRight: { alignItems: 'flex-end' },
  rowLeft: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  textUser: { color: '#fff' },
  textBot: { color: Colors.text },
  chipsScroll: { marginTop: 6 },
  chip: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  chipText: { color: Colors.primary, fontSize: 12, fontWeight: '500' },
  newsWrap: { paddingHorizontal: 12, paddingVertical: 4 },
  newsLabel: { color: Colors.textSub, fontSize: 12, fontWeight: '500', marginBottom: 6 },
  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 6,
  },
  newsCardOpen: {
    borderColor: Colors.primary + '66',
    backgroundColor: Colors.primary + '0F',
  },
  newsRow: { flexDirection: 'row', alignItems: 'center' },
  newsTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text },
  newsDate: { fontSize: 11, color: Colors.textMuted, marginLeft: 8 },
  newsChevron: { fontSize: 10, color: Colors.textMuted, marginLeft: 4 },
  newsDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17, marginTop: 6 },
  newsLink: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 6 },
  thinkingWrap: { paddingHorizontal: 20, paddingVertical: 4 },
  thinkingBubble: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 3,
  },
});
