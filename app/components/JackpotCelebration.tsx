"use client";

import { useEffect, useState } from 'react';

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

const colors = [
  '#FF5252', '#FFEB3B', '#2196F3', '#4CAF50', 
  '#9C27B0', '#FF9800', '#00BCD4', '#F44336'
];

export function Fireworks({ amount = 3, isVisible }: FireworkProps) {
  const [fireworks, setFireworks] = useState<Particle[]>([]);
  
  // Create firework explosion
  const createExplosion = (x: number, y: number) => {
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const size = 3 + Math.random() * 3;
      const life = 30 + Math.random() * 60;
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
      const y = 10 + Math.random() * 40;
      initialFireworks.push(...createExplosion(x, y));
    }
    
    setFireworks(initialFireworks);
    
    // Launch more fireworks periodically
    const interval = setInterval(() => {
      if (!isVisible) return;
      
      const x = 10 + Math.random() * 80;
      const y = 10 + Math.random() * 40;
      
      setFireworks(prev => [...prev, ...createExplosion(x, y)]);
    }, 800);
    
    // Animation frame to update particles
    const updateFrame = () => {
      if (!isVisible) return;
      
      setFireworks(prev => 
        prev
          .map(particle => ({
            ...particle,
            x: particle.x + Math.cos(particle.angle) * particle.speed,
            y: particle.y + Math.sin(particle.angle) * particle.speed,
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
      clearInterval(interval);
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
          }}
        />
      ))}
    </div>
  );
}

export default function JackpotCelebration({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
      <Fireworks amount={5} isVisible={isVisible} />
      
      <div className="text-center animate-bounce">
        <h1 className="text-6xl font-bold text-yellow-400 glow-text mb-4">JACKPOT!</h1>
        <p className="text-2xl text-white">You Won 0.1 ETH!</p>
      </div>
    </div>
  );
} 