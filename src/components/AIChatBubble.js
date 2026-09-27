// src/components/AIChatBubble.js
// Conversational chat message bubble with real-time streaming typing effect, sage avatar, and markdown formatting

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../theme/colors';
import { formatTimeString } from '../services/databaseService';

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 200);
    const a3 = animateDot(dot3, 400);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingContainer}>
      <Text style={styles.typingLabel}>Sage is thinking</Text>
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { opacity: dot1, transform: [{ scale: dot1 }] }]} />
        <Animated.View style={[styles.dot, { opacity: dot2, transform: [{ scale: dot2 }] }]} />
        <Animated.View style={[styles.dot, { opacity: dot3, transform: [{ scale: dot3 }] }]} />
      </View>
    </View>
  );
}

function BlinkingCursor() {
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [cursorOpacity]);

  return (
    <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
      ▌
    </Animated.Text>
  );
}

export default function AIChatBubble({ message, onQuickReplyPress }) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  // Renders simple bold and markdown lists
  const renderFormattedText = (rawText) => {
    if (!rawText && !isStreaming) return null;

    if (isStreaming && !rawText) {
      return <TypingDots />;
    }

    // Splits into lines
    const lines = (rawText || '').split('\n');

    return (
      <View>
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <View key={lIdx} style={{ height: 6 }} />;
          }

          // Bullet points
          const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
          const content = isBullet ? trimmed.substring(2) : trimmed;

          // Parse **bold** parts
          const parts = content.split(/(\*\*.*?\*\*)/g);

          return (
            <View key={lIdx} style={[styles.textLine, isBullet && styles.bulletLine]}>
              {isBullet && <View style={styles.bulletDot} />}
              <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <Text key={pIdx} style={styles.boldText}>
                        {part.slice(2, -2)}
                      </Text>
                    );
                  }
                  return part;
                })}
                {/* Append blinking cursor to the last line while streaming */}
                {isStreaming && lIdx === lines.length - 1 && <BlinkingCursor />}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      {/* AI Sage Leaf Avatar */}
      {!isUser && (
        <View style={styles.avatarCircle}>
          <Ionicons name="leaf" size={14} color={colors.sageBright} />
        </View>
      )}

      <View style={[styles.bubbleWrapper, isUser ? styles.userBubbleWrapper : styles.aiBubbleWrapper]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {renderFormattedText(message.text)}

          <Text style={[styles.timeText, isUser ? styles.userTimeText : styles.aiTimeText]}>
            {formatTimeString(message.timestamp)}
          </Text>
        </View>

        {/* Quick Reply Chips if provided */}
        {!isStreaming && message.quickReplies && message.quickReplies.length > 0 && (
          <View style={styles.quickRepliesContainer}>
            {message.quickReplies.map((reply, rIdx) => (
              <TouchableOpacity
                key={rIdx}
                style={styles.replyChip}
                onPress={() => onQuickReplyPress?.(reply)}
                activeOpacity={0.7}
              >
                <Text style={styles.replyChipText}>{reply}</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.sageBright} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.sageSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.3)',
  },
  bubbleWrapper: {
    maxWidth: '82%',
  },
  userBubbleWrapper: {
    alignItems: 'flex-end',
  },
  aiBubbleWrapper: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: '#2A3B31',
    borderColor: 'rgba(107, 155, 125, 0.4)',
    borderBottomRightRadius: radius.xs,
  },
  aiBubble: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.cardBorder,
    borderBottomLeftRadius: radius.xs,
  },
  textLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 1,
    flexWrap: 'wrap',
  },
  bulletLine: {
    paddingLeft: 4,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.sageBright,
    marginTop: 8,
    marginRight: 6,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  boldText: {
    fontWeight: '700',
    color: colors.sageBright,
  },
  userText: {
    color: '#FFF',
  },
  aiText: {
    color: colors.textPrimary,
  },
  cursor: {
    color: colors.sageBright,
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 2,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  typingLabel: {
    ...typography.caption,
    color: colors.sageBright,
    marginRight: 8,
    fontStyle: 'italic',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.sageBright,
    marginHorizontal: 2,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimeText: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  aiTimeText: {
    color: colors.textTertiary,
  },
  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  replyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(107, 155, 125, 0.3)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  replyChipText: {
    ...typography.caption,
    color: colors.textPrimary,
    marginRight: 4,
  },
});
