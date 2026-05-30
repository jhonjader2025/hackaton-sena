// src/components/ChatAsistente.jsx
import React, { useState, useRef, useEffect } from 'react';
import { enviarPreguntaAsistente } from '../services/assistantService'; // Ajusta la ruta según tu proyecto

export const ChatAsistente = () => {
  const [mensajes, setMensajes] = useState([
    {
      remitente: 'bot',
      texto: '¡Hola! Soy Evamap IA 🚀, tu asistente experto en la movilidad de Medellín. ¿En qué puedo ayudarte hoy?'
    }
  ]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll al último mensaje recibido
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    if (!input.trim() || cargando) return;

    const preguntaUsuario = input.trim();
    setInput('');
    
    // 1. Añadir el mensaje del usuario a la pantalla
    setMensajes((prev) => [...prev, { remitente: 'user', texto: preguntaUsuario }]);
    setCargando(true);

    // 2. Estructurar el historial que pide el backend (RF-28)
    // Filtramos los mensajes para armar parejas de {pregunta, respuesta}
    const historialFormateado = [];
    for (let i = 1; i < mensajes.length; i += 2) {
      if (mensajes[i] && mensajes[i + 1]) {
        historialFormateado.push({
          pregunta: mensajes[i].texto,
          respuesta: mensajes[i + 1].texto,
        });
      }
    }

    // 3. Llamar al backend de Python
    const data = await enviarPreguntaAsistente(preguntaUsuario, historialFormateado);

    // 4. Mostrar la respuesta de la IA en la pantalla
    setMensajes((prev) => [
      ...prev,
      { remitente: 'bot', texto: data.respuesta, proveedor: data.proveedor }
    ]);
    setCargando(false);
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', border: '1px solid #ccc', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '500px', backgroundColor: '#f9f9f9' }}>
      {/* Cabecera */}
      <div style={{ padding: '15px', backgroundColor: '#0052cc', color: '#white', borderTopLeftRadius: '7px', borderTopRightRadius: '7px' }}>
        <h3 style={{ margin: 0, color: 'white' }}>🤖 Evamap IA — Asistente Vial</h3>
        <small style={{ color: '#e0e0e0' }}>Medellín Inteligente</small>
      </div>

      {/* Caja de Mensajes */}
      <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {mensajes.map((msg, index) => (
          <div
            key={index}
            style={{
              alignSelf: msg.remitente === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: msg.remitente === 'user' ? '#0052cc' : '#e2e8f0',
              color: msg.remitente === 'user' ? 'white' : '#1a202c',
              padding: '10px 14px',
              borderRadius: '12px',
              maxWidth: '80%',
              fontSize: '14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {msg.texto}
            {msg.proveedor && (
              <div style={{ fontSize: '10px', marginTop: '4px', textAlign: 'right', opacity: 0.6 }}>
                vía {msg.proveedor}
              </div>
            )}
          </div>
        ))}
        {cargando && (
          <div style={{ alignSelf: 'flex-start', backgroundColor: '#e2e8f0', padding: '10px', borderRadius: '12px', fontSize: '14px', italic: 'true' }}>
            Evamaps está pensando... 🔄
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Formulario de Entrada */}
      <form onSubmit={manejarEnvio} style={{ display: 'flex', borderTop: '1px solid #ccc', padding: '10px', backgroundColor: 'white', borderBottomLeftRadius: '7px', borderBottomRightRadius: '7px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre el tráfico o clima de Medellín..."
          disabled={cargando}
          style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '8px', outline: 'none' }}
        />
        <button
          type="submit"
          disabled={cargando}
          style={{ padding: '10px 16px', backgroundColor: '#0052cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
};