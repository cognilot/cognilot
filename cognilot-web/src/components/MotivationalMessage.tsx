import React, { useState, useEffect } from 'react';

const MESSAGES = [
  'Ya falta poco... solo escribirás esto UNA sola vez 😤',
  'No seas flojo, esto es por tu bien 💪',
  '¿Sabías que los que completan su perfil obtienen 40% mejores respuestas? (me lo inventé, pero suena bien)',
  'Tu yo del futuro te va a agradecer esto...',
  'Vamos, que Netflix no se va a ver solo... o sí 🍿',
  'Esto es más rápido que hacer una fila en el banco 🏦',
  'Si puedes scrollear TikTok 2 horas, puedes llenar esto en 2 minutos 📱',
];

export const MotivationalMessage: React.FC = () => {
  const [message, setMessage] = useState(MESSAGES[0]);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * MESSAGES.length);
        setMessage(MESSAGES[randomIndex]);
        setFade(true);
      }, 500); // Wait for fade out
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-4 text-center">
      <p
        className={`text-sm text-ghost italic transition-opacity duration-500 ${
          fade ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {message}
      </p>
    </div>
  );
};
