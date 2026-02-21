import { Card, Rank, Suit } from './types';
import { v4 as uuidv4 } from 'uuid';

export const CARD_RULES: Record<Rank, { title: string; text: string }> = {
  'A': { title: 'Waterfall', text: 'Everyone drinks! Start with the person who drew the card.' },
  '2': { title: 'You', text: 'Pick someone to drink.' },
  '3': { title: 'Me', text: 'You drink.' },
  '4': { title: 'Whores', text: 'All ladies drink.' },
  '5': { title: 'Never Have I Ever', text: 'Play a round of Never Have I Ever. Losers drink.' },
  '6': { title: 'Dicks', text: 'All guys drink.' },
  '7': { title: 'Heaven', text: 'Point to the sky! Last one drinks. (If you keep the card, you can use it later)' },
  '8': { title: 'Mate', text: 'Pick a mate. When you drink, they drink.' },
  '9': { title: 'Rhyme', text: 'Pick a word. Go around rhyming. First to fail drinks.' },
  '10': { title: 'Categories', text: 'Pick a category. Go around listing things. First to fail drinks.' },
  'J': { title: 'Thumbmaster', text: 'You are the Thumbmaster. Place thumb on table/screen silently. Others follow. Last one drinks.' },
  'Q': { title: 'Question Master', text: 'You are the Question Master. If anyone answers your question, they drink.' },
  'K': { title: 'Make a Rule', text: 'Make a rule. Anyone who breaks it drinks. (4th King ends the game!)' },
};

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: uuidv4(),
        suit,
        rank,
        title: CARD_RULES[rank].title,
        text: CARD_RULES[rank].text,
        ruleTitle: CARD_RULES[rank].title,
      } as any); 
    });
  });
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};
