const entradaUrlServidor = document.getElementById('serverUrl');
const botaoConectar = document.getElementById('connectBtn');
const audioEl = document.getElementById('audio');
const elementoStatus = document.getElementById('status');

const player = document.getElementById('music-player');
const albumCoverEl = document.getElementById('album-cover');
const songTitleEl = document.getElementById('song-title');
const songArtistEl = document.getElementById('song-artist');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = playPauseBtn?.querySelector('i');
const progressBar = document.querySelector('.progress-bar');
const progressEl = document.getElementById('progress');

const playlistBtn = document.getElementById('playlist-btn');
const playlistOverlay = document.getElementById('playlist-overlay');
const songListEl = document.getElementById('songList');

// --- Controles extras ---
const prevBtn = document.querySelector('.controls .fa-step-backward')?.parentElement;
const nextBtn = document.querySelector('.controls .fa-step-forward')?.parentElement;
const repeatBtn = document.querySelector('.controls .fa-redo')?.parentElement;
const shuffleBtn = document.querySelector('.controls .fa-random')?.parentElement;
const volumeBtn = document.getElementById('volume-btn');

const volumeSlider = document.getElementById('volume-slider');

volumeSlider?.addEventListener('input', () => {
    audioEl.volume = parseFloat(volumeSlider.value);
    console.log('Volume mudado para', audioEl.volume);

    const icon = volumeBtn.querySelector('i');
    if (audioEl.muted || audioEl.volume === 0) {
        icon.className = 'fas fa-volume-xmark';
    } else if (audioEl.volume < 0.5) {
        icon.className = 'fas fa-volume-low';
    } else {
        icon.className = 'fas fa-volume-high';
    }

    if (audioEl.muted && audioEl.volume > 0) {
        audioEl.muted = false;
    }
});

// --- Estados ---
let currentBaseUrl = '';
let musicasDisponiveis = [];
let currentIndex = -1;
let repeatMode = false;
let shuffleMode = false;
let historicoMusicas = []; // Histórico

console.log('Script carregado, histórico inicial:', historicoMusicas);

// --- Carregar URL salva ---
const urlSalva = localStorage.getItem('urlServidor') ?? localStorage.getItem('serverUrl');
if (urlSalva) {
    entradaUrlServidor.value = urlSalva;
    console.log('URL salva encontrada:', urlSalva);
    botaoConectar?.click();
}

// --- Conectar ao servidor ---
botaoConectar?.addEventListener('click', async () => {
    const base = entradaUrlServidor.value.trim().replace(/\/$/, '');
    console.log('Tentando conectar ao servidor em:', base);

    if (!base) {
        definirStatus('Informe a URL do servidor.');
        return;
    }

    localStorage.setItem('urlServidor', base);
    localStorage.setItem('serverUrl', base);
    currentBaseUrl = base;

    definirStatus('Conectando…');
    songTitleEl.textContent = "Conectando...";
    songArtistEl.textContent = "Aguarde...";

    try {
        const saude = await buscarJSON(juntarUrl(base, '/api/saude'));
        definirStatus(`Conectado. ${saude.count} músicas disponíveis.`);
        console.log('Saúde do servidor:', saude);

        const musicas = await buscarJSON(juntarUrl(base, '/api/musicas'));
        musicasDisponiveis = musicas;
        console.log('Músicas disponíveis:', musicasDisponiveis);

        renderizarPlaylist(musicas);

        songTitleEl.textContent = "Conectado";
        songArtistEl.textContent = `Pronto para tocar ${musicas.length} músicas.`;

    } catch (erro) {
        definirStatus('Falha ao conectar. Verifique a URL e a rede.');
        songTitleEl.textContent = "Erro de Conexão";
        songArtistEl.textContent = "Verifique a URL e tente novamente.";
        console.error(erro);
    }
});

// --- Playlist ---
function renderizarPlaylist(musicas) {
    songListEl.innerHTML = '';
    if (!musicas || !musicas.length) {
        songListEl.innerHTML = '<li>Nenhuma música encontrada no servidor.</li>';
        return;
    }
    musicas.forEach((musica, index) => {
        const li = document.createElement('li');
        li.textContent = `${musica.title || '(Sem título)'} - ${musica.artist || 'Desconhecido'}`;
        li.addEventListener('click', () => {
            console.log('Selecionou música da lista:', musica);
            tocarMusicaPorIndex(index);
            playlistOverlay.classList.add('hidden');
        });
        songListEl.appendChild(li);
    });
}

playlistBtn?.addEventListener('click', () => {
    console.log('Overlay da playlist aberto');
    playlistOverlay.classList.remove('hidden');
});

playlistOverlay?.addEventListener('click', (e) => {
    if (e.target === playlistOverlay) {
        console.log('Clique fora da lista — fecha overlay');
        playlistOverlay.classList.add('hidden');
    }
});

// --- Reprodução ---
function tocarMusicaPorIndex(index) {
    if (!musicasDisponiveis.length) return;
    if (index < 0) index = musicasDisponiveis.length - 1;
    if (index >= musicasDisponiveis.length) index = 0;
    currentIndex = index;
    console.log('Tocando música por index:', index);
    tocarMusica(musicasDisponiveis[currentIndex]);
}

function tocarMusica(musica) {
    if (!musica) {
        console.warn('música inválida em tocarMusica:', musica);
        return;
    }
    console.log('tocarMusica chamada para:', musica);

    const url = musica.url?.startsWith('http')
        ? musica.url
        : juntarUrl(currentBaseUrl, musica.url);

    audioEl.src = url;
    audioEl.play();

    songTitleEl.textContent = musica.title || '(Sem título)';
    songArtistEl.textContent = musica.artist || 'Desconhecido';
    albumCoverEl.src = musica.cover
        ? juntarUrl(currentBaseUrl, musica.cover)
        : '/img/disco.png';

    if (playIcon) playIcon.className = 'fas fa-pause';

    currentIndex = musicasDisponiveis.indexOf(musica);

    atualizarHistorico(musica); // histórico deve ser atualizado
}

// --- Play / Pause ---
playPauseBtn?.addEventListener('click', () => {
    if (audioEl.paused) {
        console.log('Play pressionado');
        audioEl.play();
    } else {
        console.log('Pause pressionado');
        audioEl.pause();
    }
});

audioEl.addEventListener('play', () => {
    if (playIcon) playIcon.className = 'fas fa-pause';
});
audioEl.addEventListener('pause', () => {
    if (playIcon) playIcon.className = 'fas fa-play';
});

audioEl.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audioEl;
    if (duration) {
        const progressPercent = (currentTime / duration) * 100;
        if (progressEl) progressEl.style.width = `${progressPercent}%`;
    }
});

progressBar?.addEventListener('click', (e) => {
    const width = progressBar.clientWidth;
    const clickX = e.offsetX;
    const duration = audioEl.duration;
    if (duration) {
        audioEl.currentTime = (clickX / width) * duration;
    }
});

// --- Controles extras ---
prevBtn?.addEventListener('click', () => {
    console.log('Botão prev clicado');
    tocarMusicaPorIndex(currentIndex - 1);
});
nextBtn?.addEventListener('click', () => {
    console.log('Botão next clicado');
    tocarMusicaPorIndex(currentIndex + 1);
});
repeatBtn?.addEventListener('click', () => {
    repeatMode = !repeatMode;
    console.log('RepeatMode agora:', repeatMode);
    repeatBtn.style.color = repeatMode ? "#000" : "#8aa6be";
});
shuffleBtn?.addEventListener('click', () => {
    shuffleMode = !shuffleMode;
    console.log('ShuffleMode agora:', shuffleMode);
    shuffleBtn.style.color = shuffleMode ? "#000" : "#8aa6be";
});
volumeBtn?.addEventListener('click', () => {
    audioEl.muted = !audioEl.muted;
    const icon = volumeBtn.querySelector('i');
    if (icon) {
        icon.className = audioEl.muted ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
    }
    console.log('Mute toggled. Agora muted =', audioEl.muted);
});

// --- Ao terminar a música ---
audioEl.addEventListener('ended', () => {
    console.log('Música terminada. repeatMode:', repeatMode, ' shuffleMode:', shuffleMode);
    if (repeatMode) {
        audioEl.currentTime = 0;
        audioEl.play();
    } else if (shuffleMode) {
        const randomIndex = Math.floor(Math.random() * musicasDisponiveis.length);
        tocarMusicaPorIndex(randomIndex);
    } else {
        tocarMusicaPorIndex(currentIndex + 1);
    }
});

// --- Atualizar Histórico ---
function atualizarHistorico(musica) {
    console.log('atualizarHistorico chamada para:', musica);
    if (historicoMusicas.length > 0 && historicoMusicas[0].url === musica.url) {
        console.log('Mesma música consecutiva — não adiciona ao histórico');
        return;
    }

    historicoMusicas.unshift(musica);
    if (historicoMusicas.length > 20) historicoMusicas.pop();

    const lista = document.getElementById('song-history');
    if (!lista) {
        console.warn('Elemento #song-history não encontrado');
        return;
    }

    lista.innerHTML = '';

    historicoMusicas.forEach((item, idx) => {
        const li = document.createElement('li');
        li.textContent = `${item.title || '(Sem título)'} - ${item.artist || 'Desconhecido'}`;
        lista.appendChild(li);
    });

    console.log('Histórico atualizado:', historicoMusicas);
}

// --- Utils ---
function juntarUrl(base, relativo) {
    try {
        return new URL(relativo, base).href;
    } catch {
        return base.replace(/\/+$/, '') + '/' + relativo.replace(/^\/+/, '');
    }
}

async function buscarJSON(url) {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return resposta.json();
}

function definirStatus(mensagem) {
    if (elementoStatus) {
        elementoStatus.textContent = mensagem;
    }
}
