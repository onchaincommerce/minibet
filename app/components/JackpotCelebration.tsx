"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Particle {
  id: number;
  x: number;
  y: number;
  speed: number;
  angle: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface FireworkProps {
  amount: number;
  isVisible: boolean;
}

interface JackpotCelebrationProps {
  isVisible: boolean;
  payoutAmount?: string;
  tier?: number | null;
}

const colors = [
  '#FF5252', '#FFEB3B', '#2196F3', '#4CAF50', 
  '#9C27B0', '#FF9800', '#00BCD4', '#F44336',
  '#FFC107', '#E91E63', '#3F51B5', '#8BC34A'
];

export function Fireworks({ amount = 3, isVisible }: FireworkProps) {
  const [fireworks, setFireworks] = useState<Particle[]>([]);
  
  // Create firework explosion
  const createExplosion = (x: number, y: number) => {
    const newParticles: Particle[] = [];
    
    // Increase particle count for more dramatic effect
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      const size = 2 + Math.random() * 4;
      const life = 40 + Math.random() * 80;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      newParticles.push({
        id: Date.now() + i,
        x, 
        y,
        angle,
        speed,
        size,
        color,
        life,
        maxLife: life
      });
    }
    
    return newParticles;
  };
  
  useEffect(() => {
    if (!isVisible) {
      setFireworks([]);
      return;
    }
    
    // Launch initial fireworks
    const initialFireworks: Particle[] = [];
    for (let i = 0; i < amount; i++) {
      const x = 10 + Math.random() * 80;
      const y = 10 + Math.random() * 60;
      initialFireworks.push(...createExplosion(x, y));
    }
    
    setFireworks(initialFireworks);
    
    // Launch more fireworks at random positions with varied timing
    const intervals: NodeJS.Timeout[] = [];
    
    for (let i = 0; i < 3; i++) {
      const interval = setInterval(() => {
        if (!isVisible) return;
        
        const x = 10 + Math.random() * 80;
        const y = 10 + Math.random() * 60;
        
        setFireworks(prev => [...prev, ...createExplosion(x, y)]);
      }, 600 + Math.random() * 800);
      
      intervals.push(interval);
    }
    
    // Animation frame to update particles
    const updateFrame = () => {
      if (!isVisible) return;
      
      setFireworks(prev => 
        prev
          .map(particle => ({
            ...particle,
            x: particle.x + Math.cos(particle.angle) * particle.speed,
            y: particle.y + Math.sin(particle.angle) * particle.speed,
            // Add gravity effect to particles
            speed: particle.speed * 0.98,
            life: particle.life - 1,
          }))
          .filter(particle => particle.life > 0)
      );
      
      if (isVisible) {
        requestAnimationFrame(updateFrame);
      }
    };
    
    const animationId = requestAnimationFrame(updateFrame);
    
    return () => {
      intervals.forEach(interval => clearInterval(interval));
      cancelAnimationFrame(animationId);
    };
  }, [amount, isVisible]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {fireworks.map(particle => (
        <div 
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.life / particle.maxLife,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
        />
      ))}
    </div>
  );
}

function CoinShower({ isVisible }: { isVisible: boolean }) {
  const [coins, setCoins] = useState<Particle[]>([]);
  
  useEffect(() => {
    if (!isVisible) {
      setCoins([]);
      return;
    }
    
    // Create initial coins
    const initialCoins: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      initialCoins.push({
        id: Date.now() + i,
        x: Math.random() * 100, 
        y: -10 - Math.random() * 20,
        angle: Math.PI / 2 + (Math.random() * 0.4 - 0.2),  // Mostly downward
        speed: 2 + Math.random() * 4,
        size: 20 + Math.random() * 15,
        color: '#FFD700',  // Gold color
        life: 200 + Math.random() * 200,
        maxLife: 400
      });
    }
    
    setCoins(initialCoins);
    
    // Spawn new coins periodically
    const interval = setInterval(() => {
      if (!isVisible) return;
      
      const newCoins: Particle[] = [];
      const coinCount = 5 + Math.floor(Math.random() * 5);
      
      for (let i = 0; i < coinCount; i++) {
        newCoins.push({
          id: Date.now() + i,
          x: Math.random() * 100, 
          y: -10 - Math.random() * 20,
          angle: Math.PI / 2 + (Math.random() * 0.4 - 0.2),
          speed: 2 + Math.random() * 4,
          size: 20 + Math.random() * 15,
          color: Math.random() > 0.3 ? '#FFD700' : '#C0C0C0',
          life: 200 + Math.random() * 200,
          maxLife: 400
        });
      }
      
      setCoins(prev => [...prev, ...newCoins]);
    }, 500);
    
    // Animation frame to update coins
    const updateFrame = () => {
      if (!isVisible) return;
      
      setCoins(prev => 
        prev
          .map(coin => ({
            ...coin,
            x: coin.x + Math.cos(coin.angle) * coin.speed * 0.3,
            y: coin.y + Math.sin(coin.angle) * coin.speed,
            // Add gravity and rotation effects
            speed: coin.speed * 1.03,
            life: coin.life - 1,
          }))
          .filter(coin => coin.life > 0 && coin.y < 120)
      );
      
      if (isVisible) {
        requestAnimationFrame(updateFrame);
      }
    };
    
    const animationId = requestAnimationFrame(updateFrame);
    
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationId);
    };
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {coins.map(coin => (
        <div 
          key={coin.id}
          className="absolute rounded-full flex items-center justify-center animate-spin"
          style={{
            left: `${coin.x}%`,
            top: `${coin.y}%`,
            width: `${coin.size}px`,
            height: `${coin.size}px`,
            backgroundColor: coin.color,
            boxShadow: `0 0 10px ${coin.color}`,
            opacity: Math.min(1, coin.life / (coin.maxLife * 0.3)),
            animationDuration: `${3 + Math.random() * 3}s`,
          }}
        >
          <span className="text-xs font-bold" style={{ color: coin.color === '#FFD700' ? '#B8860B' : '#A9A9A9' }}>$</span>
        </div>
      ))}
    </div>
  );
}

export default function JackpotCelebration({ isVisible, payoutAmount = "0.1", tier = 1 }: JackpotCelebrationProps) {
  const [animationPhase, setAnimationPhase] = useState(0);
  
  useEffect(() => {
    if (!isVisible) {
      setAnimationPhase(0);
      return;
    }
    
    // Sequence the animations
    const timer1 = setTimeout(() => setAnimationPhase(1), 200);
    const timer2 = setTimeout(() => setAnimationPhase(2), 1000);
    const timer3 = setTimeout(() => setAnimationPhase(3), 2000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  const getTierText = () => {
    if (tier === 1) return "JACKPOT!";
    if (tier === 2) return "BIG WIN!";
    return "YOU WON!";
  };
  
  const getTierClass = () => {
    if (tier === 1) return "text-yellow-400 glow-text-yellow";
    if (tier === 2) return "text-green-400 glow-text-green";
    return "text-blue-400 glow-text-blue";
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none bg-black bg-opacity-60">
      {/* Different animations based on tier */}
      {tier === 1 && <Fireworks amount={5} isVisible={animationPhase >= 1} />}
      <CoinShower isVisible={animationPhase >= 2} />
      
      {/* Floating fairies for all win tiers */}
      {animationPhase >= 1 && (
        <div className="fixed inset-0 z-30 pointer-events-none">
          <div className="floating-fairy fairy-1">
            <Image src="/fairy.png" alt="Fairy" width={24} height={24} className="w-16 h-16 object-contain pixelated" />
          </div>
          <div className="floating-fairy fairy-2">
            <Image src="/fairy.png" alt="Fairy" width={16} height={16} className="w-12 h-12 object-contain pixelated" />
          </div>
          <div className="floating-fairy fairy-3">
            <Image src="/fairy.png" alt="Fairy" width={32} height={32} className="w-20 h-20 object-contain pixelated" />
          </div>
          {tier === 1 && (
            <>
              <div className="floating-fairy fairy-4">
                <Image src="/fairy.png" alt="Fairy" width={24} height={24} className="w-16 h-16 object-contain pixelated" />
              </div>
              <div className="floating-fairy fairy-5">
                <Image src="/fairy.png" alt="Fairy" width={22} height={22} className="w-14 h-14 object-contain pixelated" />
              </div>
            </>
          )}
        </div>
      )}
      
      <div className={`text-center transition-all duration-500 ${
        animationPhase >= 3 ? "scale-100 opacity-100" : "scale-50 opacity-0"
      }`}>
        <h1 className={`text-6xl font-bold ${getTierClass()} mb-4 animate-bounce`}>
          {getTierText()}
        </h1>
        <p className="text-3xl text-white drop-shadow-lg">
          You Won <span className="font-bold text-yellow-300">{payoutAmount} ETH!</span>
        </p>
        
        {/* Center fairy for jackpot */}
        {tier === 1 && animationPhase >= 3 && (
          <div className="mt-6 flex justify-center">
            <Image 
              src="/fairy.png" 
              alt="Fairy" 
              width={36}
              height={36}
              className="w-24 h-24 object-contain pixelated animate-pulse"
            />
          </div>
        )}
        
        {/* Tier-specific decorations */}
        {tier === 1 && (
          <div className="mt-8 flex justify-center">
            <div className="animate-pulse text-4xl mx-1">💰</div>
            <div className="animate-pulse text-4xl mx-1 delay-75">💰</div>
            <div className="animate-pulse text-4xl mx-1 delay-150">💰</div>
          </div>
        )}
        
        {tier === 2 && (
          <div className="mt-8 flex justify-center">
            <div className="animate-pulse text-4xl mx-1">🎉</div>
            <div className="animate-pulse text-4xl mx-1 delay-75">💸</div>
          </div>
        )}
      </div>
    </div>
  );
} 