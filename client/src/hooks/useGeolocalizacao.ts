import { useState, useEffect, useCallback } from 'react';

export type StatusGeo =
  | 'verificando'    // aguardando resposta do GPS
  | 'solicitando'    // pedindo permissão ao usuário
  | 'negado'         // usuário negou permissão
  | 'fora_brasil'    // localização fora do Brasil
  | 'erro'           // erro genérico de geolocalização
  | 'autorizado';    // dentro do Brasil, acesso liberado

export interface ResultadoGeo {
  status: StatusGeo;
  mensagem: string;
  latitude?: number;
  longitude?: number;
  tentarNovamente: () => void;
}

// Limites aproximados do Brasil (bounding box)
// Latitude: -33.75 (sul, RS) até 5.27 (norte, RR)
// Longitude: -73.99 (oeste, AC) até -28.85 (leste, PB/PE)
function estaNoBrasil(lat: number, lon: number): boolean {
  return lat >= -33.75 && lat <= 5.27 && lon >= -73.99 && lon <= -28.85;
}

export function useGeolocalizacao(): ResultadoGeo {
  const [status, setStatus] = useState<StatusGeo>('solicitando');
  const [mensagem, setMensagem] = useState('Verificando sua localização...');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | undefined>();
  const [tentativa, setTentativa] = useState(0);

  const verificar = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('erro');
      setMensagem(
        'Seu navegador não suporta geolocalização. Por favor, utilize um navegador atualizado (Chrome, Edge ou Firefox).'
      );
      return;
    }

    setStatus('verificando');
    setMensagem('Verificando sua localização...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });

        if (estaNoBrasil(latitude, longitude)) {
          setStatus('autorizado');
          setMensagem('Localização verificada com sucesso.');
        } else {
          setStatus('fora_brasil');
          setMensagem(
            'Acesso não autorizado: sua localização está fora do território brasileiro. ' +
            'Este sistema é de uso exclusivo da Coban — Banco do Brasil no Brasil.'
          );
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setStatus('negado');
            setMensagem(
              'Permissão de localização negada. Para acessar o sistema, você precisa ' +
              'autorizar o uso da sua localização no navegador e clicar em "Tentar Novamente".'
            );
            break;
          case error.POSITION_UNAVAILABLE:
            setStatus('erro');
            setMensagem(
              'Não foi possível obter sua localização. Verifique se o GPS está ativado ' +
              'no seu dispositivo e tente novamente.'
            );
            break;
          case error.TIMEOUT:
            setStatus('erro');
            setMensagem(
              'Tempo esgotado ao obter localização. Verifique sua conexão e tente novamente.'
            );
            break;
          default:
            setStatus('erro');
            setMensagem('Erro ao verificar localização. Por favor, tente novamente.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000, // cache de 5 minutos
      }
    );
  }, [tentativa]);

  useEffect(() => {
    verificar();
  }, [verificar]);

  const tentarNovamente = useCallback(() => {
    setTentativa((t) => t + 1);
  }, []);

  return {
    status,
    mensagem,
    latitude: coords?.lat,
    longitude: coords?.lon,
    tentarNovamente,
  };
}
