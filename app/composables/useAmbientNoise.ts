type AmbientAudioHandle = {
  context: AudioContext;
  source: AudioBufferSourceNode;
};

export function useAmbientNoise() {
  let audio: AmbientAudioHandle | null = null;

  async function start() {
    if (audio) return true;
    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) return false;
    const context = new AudioContextCtor();
    if (context.state === "suspended") await context.resume();
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) channel[index] = (Math.random() * 2 - 1) * 0.18;

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.value = 880;
    filter.Q.value = 0.3;
    gain.gain.value = 0.045;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start();
    audio = { context, source };
    return true;
  }

  function stop() {
    if (!audio) return;
    audio.source.stop();
    void audio.context.close();
    audio = null;
  }

  onBeforeUnmount(stop);
  return { start, stop };
}
