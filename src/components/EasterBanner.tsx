import { useState, useEffect } from "react";

const wisdomQuotes = [
  // Bible Verses
  { text: "Love is patient, love is kind. It does not envy, it does not boast.", author: "1 Corinthians 13:4" },
  { text: "Love bears all things, believes all things, hopes all things, endures all things.", author: "1 Corinthians 13:7" },
  { text: "Love never fails.", author: "1 Corinthians 13:8" },
  { text: "So now faith, hope, and love abide, these three; but the greatest of these is love.", author: "1 Corinthians 13:13" },
  { text: "Let all that you do be done in love.", author: "1 Corinthians 16:14" },
  { text: "Above all, love each other deeply, because love covers over a multitude of sins.", author: "1 Peter 4:8" },
  { text: "Beloved, let us love one another, for love is from God.", author: "1 John 4:7" },
  { text: "I have found the one whom my soul loves.", author: "Song of Solomon 3:4" },
  { text: "For God so loved the world that He gave His one and only Son.", author: "John 3:16" },
  { text: "The Lord is my shepherd; I shall not want.", author: "Psalm 23:1" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", author: "Proverbs 3:5" },
  { text: "I can do all things through Christ who strengthens me.", author: "Philippians 4:13" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged.", author: "Joshua 1:9" },
  { text: "The Lord bless you and keep you; the Lord make His face shine on you.", author: "Numbers 6:24-25" },

  // Quran Quotes
  { text: "And He found you lost and guided you.", author: "Quran 93:7" },
  { text: "Verily, with hardship comes ease.", author: "Quran 94:6" },
  { text: "Allah does not burden a soul beyond that it can bear.", author: "Quran 2:286" },
  { text: "So remember Me; I will remember you.", author: "Quran 2:152" },
  { text: "My mercy encompasses all things.", author: "Quran 7:156" },
  { text: "And whoever puts their trust in Allah, He will be enough for them.", author: "Quran 65:3" },
  { text: "Do good to others, surely Allah loves those who do good to others.", author: "Quran 2:195" },
  { text: "The best among you are those who have the best manners and character.", author: "Prophet Muhammad ﷺ" },
  { text: "Speak good or remain silent.", author: "Prophet Muhammad ﷺ" },
  { text: "Be kind, for whenever kindness becomes part of something, it beautifies it.", author: "Prophet Muhammad ﷺ" },

  // African Wise Sayings
  { text: "If you want to go fast, go alone. If you want to go far, go together.", author: "African Proverb" },
  { text: "It takes a village to raise a child.", author: "African Proverb" },
  { text: "However long the night, the dawn will break.", author: "African Proverb" },
  { text: "Wisdom is like a baobab tree; no one individual can embrace it.", author: "African Proverb" },
  { text: "The child who is not embraced by the village will burn it down to feel its warmth.", author: "African Proverb" },
  { text: "When there is no enemy within, the enemies outside cannot hurt you.", author: "African Proverb" },
  { text: "A tree is known by its fruit.", author: "African Proverb" },
  { text: "He who learns, teaches.", author: "Ethiopian Proverb" },
  { text: "Smooth seas do not make skillful sailors.", author: "African Proverb" },
  { text: "The sun does not forget a village just because it is small.", author: "African Proverb" },
  { text: "Do not look where you fell, but where you slipped.", author: "African Proverb" },
  { text: "Unity is strength, division is weakness.", author: "Swahili Proverb" },
  { text: "Knowledge without wisdom is like water in the sand.", author: "Guinean Proverb" },
  { text: "Sticks in a bundle are unbreakable.", author: "Kenyan Proverb" },
  { text: "Return to old watering holes for more than water; friends and dreams are there to meet you.", author: "African Proverb" },

  // Inspirational Love Quotes
  { text: "Where there is love there is life.", author: "Mahatma Gandhi" },
  { text: "The best thing to hold onto in life is each other.", author: "Audrey Hepburn" },
  { text: "To love and be loved is to feel the sun from both sides.", author: "David Viscott" },
  { text: "Love is composed of a single soul inhabiting two bodies.", author: "Aristotle" },
  { text: "The greatest thing you'll ever learn is just to love and be loved in return.", author: "Nat King Cole" },
  { text: "Love is the whole thing. We are only pieces.", author: "Rumi" },
  { text: "If I know what love is, it is because of you.", author: "Hermann Hesse" },
  { text: "There is no remedy for love but to love more.", author: "Henry David Thoreau" },
];

function getDailyQuote(): typeof wisdomQuotes[0] {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return wisdomQuotes[dayOfYear % wisdomQuotes.length];
}

export default function EasterBanner() {
  const [quote, setQuote] = useState(getDailyQuote);

  useEffect(() => {
    setQuote(getDailyQuote());
  }, []);

  return (
    <div
      className="w-full py-2.5 px-4 text-center text-xs font-semibold tracking-wider z-50 relative overflow-hidden sky-glow rounded-lg my-2"
      style={{
        background: "linear-gradient(90deg, hsl(200 85% 55% / 0.12), hsl(190 75% 50% / 0.18), hsl(210 80% 60% / 0.12))",
        borderBottom: "1px solid hsl(200 80% 55% / 0.3)",
        color: "hsl(200 85% 72%)",
        letterSpacing: "0.08em",
      }}
    >
      <span className="relative z-10 flex flex-col items-center gap-0.5">
        <span className="text-[10px] opacity-60 uppercase tracking-widest">💖 Daily Wisdom</span>
        <span className="italic text-xs md:text-sm font-medium leading-relaxed">
          "{quote.text}"
        </span>
        <span className="text-[10px] opacity-70 font-semibold">— {quote.author}</span>
      </span>
    </div>
  );
}
