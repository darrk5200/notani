const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection
} = require('@discordjs/voice');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const voice_id = "emSmWzY0c0xtx5IFMCVv"; 

function cleanupOldTTSFiles() {
  try {
    const commandsDir = __dirname;
    const files = fs.readdirSync(commandsDir);
    
    let deletedCount = 0;
    files.forEach(file => {
      if (file.startsWith('tts-') && file.endsWith('.mp3')) {
        const oldFilePath = path.join(commandsDir, file);
        fs.unlinkSync(oldFilePath);
        deletedCount++;
      }
    });
    
  } catch (err) {
    console.error('Error cleaning up old TTS files:', err);
  }
}

module.exports = {
  name: 'tts',
  description: 'Convert text to speech and play it in a voice channel',
  async execute(message, args) {
    const text = args.join(' ');
    if (!text) return message.reply('Please provide some text to convert to speech');
    
    const maxLength = 5000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text;
      
    if (text.length > maxLength) {
      console.log(`TTS text truncated from ${text.length} to ${maxLength} characters`);
    }

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('You need to join a voice channel first!');

    const processingMsg = await message.channel.send('let me get my microphone..');
    
cleanupOldTTSFiles();
    
    const fileName = `tts-${Date.now()}.mp3`;
    const filePath = path.resolve(__dirname, fileName);

    try {
      
      const existingConnection = getVoiceConnection(voiceChannel.guild.id);
      if (existingConnection) {
        existingConnection.destroy();
      }

      const apiKey = process.env.ELEVENLABS;
      if (!apiKey) { return }
      const response = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'stream',
        data: {
          text: truncatedText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.60,
            similarity_boost: 0.5
          }
        }
      });

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20000);
      } catch (error) {
        connection.destroy();
        await processingMsg.edit('Failed to connect to vc, try again later');
        cleanupFile();
        throw new Error('Failed to establish voice connection');
      }

      const player = createAudioPlayer();
      const resource = createAudioResource(filePath);

      player.on('error', error => {
        console.error('Player error:', error);
        connection.destroy();
        cleanupFile();
        processingMsg.edit('sry somebody just taped my mouth..').catch(console.error);
      });

      connection.on('stateChange', (_, newState) => {
        if (newState.status === VoiceConnectionStatus.Disconnected) {
          connection.destroy();
          cleanupFile();
        }
      });

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
        cleanupFile();
      });

      connection.subscribe(player);
      player.play(resource);

      await processingMsg.edit('listen to me speak!!');

      function cleanupFile() {
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, err => {
            if (err) console.error('Failed to delete audio file:', err);
          });
        }
      }
    } catch (error) {
      console.error('TTS error:', error);
      await processingMsg.edit('sry somebody is taping my mouth shut.');

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
};
