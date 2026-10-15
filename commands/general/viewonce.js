/**
 * ViewOnce Command - Reveal view-once messages
 */

const { downloadContentFromMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'viewonce',
  aliases: ['readvo', 'read', 'vv', 'readviewonce'],
  category: 'general',
  description: 'Révèle un message à vue unique et l\'envoie dans ton chat privé ("Vous")',
  usage: '.viewonce (répondre à un message à vue unique)',
  ownerOnly: true,
  
  async execute(sock, msg, args) {
    try {
      const sourceChat = msg.key.remoteJid;
      // Tout est envoyé dans le chat « Vous » du numéro sur lequel le bot est connecté,
      // jamais dans la conversation d'origine (aucune trace visible, aucune réaction).
      const chatId = jidNormalizedUser(sock.user.id);

      // Try to get contextInfo from different message types (reply can be from text, image, video, etc.)
      const ctx = msg.message?.extendedTextMessage?.contextInfo
        || msg.message?.imageMessage?.contextInfo
        || msg.message?.videoMessage?.contextInfo
        || msg.message?.buttonsResponseMessage?.contextInfo
        || msg.message?.listResponseMessage?.contextInfo;

      if (!ctx?.quotedMessage || !ctx?.stanzaId) {
        return await sock.sendMessage(
          chatId,
          { text: '🗑️ Reply to a *view-once* message to reveal it.' },
          {}
        );
      }

      const quotedMsg = ctx.quotedMessage;

      // Check various patterns used for view-once messages
      const hasViewOnce =
        !!quotedMsg.viewOnceMessageV2 ||
        !!quotedMsg.viewOnceMessageV2Extension ||
        !!quotedMsg.viewOnceMessage ||
        !!quotedMsg.viewOnce ||
        !!quotedMsg?.imageMessage?.viewOnce ||
        !!quotedMsg?.videoMessage?.viewOnce ||
        !!quotedMsg?.audioMessage?.viewOnce;

      if (!hasViewOnce) {
        return await sock.sendMessage(
          chatId,
          { text: '❌ This is not a view-once message!' },
          {}
        );
      }

      let actualMsg = null;
      let mtype = null;

      // Newer Baileys: viewOnceMessageV2Extension
      if (quotedMsg.viewOnceMessageV2Extension?.message) {
        actualMsg = quotedMsg.viewOnceMessageV2Extension.message;
        mtype = Object.keys(actualMsg)[0];

      // Classic Baileys: viewOnceMessageV2
      } else if (quotedMsg.viewOnceMessageV2?.message) {
        actualMsg = quotedMsg.viewOnceMessageV2.message;
        mtype = Object.keys(actualMsg)[0];

      // Older: viewOnceMessage
      } else if (quotedMsg.viewOnceMessage?.message) {
        actualMsg = quotedMsg.viewOnceMessage.message;
        mtype = Object.keys(actualMsg)[0];

      // Direct message with viewOnce flag on media
      } else if (quotedMsg.imageMessage?.viewOnce) {
        actualMsg = { imageMessage: quotedMsg.imageMessage };
        mtype = 'imageMessage';
      } else if (quotedMsg.videoMessage?.viewOnce) {
        actualMsg = { videoMessage: quotedMsg.videoMessage };
        mtype = 'videoMessage';
      } else if (quotedMsg.audioMessage?.viewOnce) {
        actualMsg = { audioMessage: quotedMsg.audioMessage };
        mtype = 'audioMessage';
      }

      if (!actualMsg || !mtype) {
        return await sock.sendMessage(
          chatId,
          { text: '❌ Unsupported view-once message type.' },
          {}
        );
      }

      const downloadType =
        mtype === 'imageMessage'
          ? 'image'
          : mtype === 'videoMessage'
          ? 'video'
          : 'audio';

      const mediaStream = await downloadContentFromMessage(
        actualMsg[mtype],
        downloadType
      );

      let buffer = Buffer.from([]);
      for await (const chunk of mediaStream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // --- NOUVEAU : Sauvegarde silencieuse sur le disque dur de Render ---
      try {
        // On remonte à la racine du projet (ajuste les '../' selon où se trouve ton fichier vv.js)
        const tempDir = path.join(__dirname, '../../temp'); 
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        let extension = '.jpg';
        if (mtype === 'videoMessage') extension = '.mp4';
        if (mtype === 'audioMessage') extension = '.ogg';
        
        const fileName = `vv_${Date.now()}${extension}`;
        const filePath = path.join(tempDir, fileName);
        
        fs.writeFileSync(filePath, buffer);
        console.log(`💾 Média Vue Unique sauvegardé sur Render : ${filePath}`);
      } catch (err) {
        console.error('Erreur lors de la sauvegarde sur Render:', err);
      }
      // --------------------------------------------------------------------

      const origin = ctx.participant || sourceChat;
      const originNumber = String(origin || '').split('@')[0].split(':')[0];
      const where = sourceChat.endsWith('@g.us') ? 'groupe' : 'discussion privée';
      const info = `👁️ Vue unique de +${originNumber} (${where})`;
      const original = actualMsg[mtype]?.caption || '';
      const caption = original ? `${info}\n\n${original}` : info;

      if (/video/.test(mtype)) {
        await sock.sendMessage(
          chatId,
          {
            video: buffer,
            caption,
            mimetype: 'video/mp4'
          },
          {}
        );
      } else if (/image/.test(mtype)) {
        await sock.sendMessage(
          chatId,
          {
            image: buffer,
            caption,
            mimetype: 'image/jpeg'
          },
          {}
        );
      } else if (/audio/.test(mtype)) {
        await sock.sendMessage(
          chatId,
          {
            audio: buffer,
            ptt: true,
            mimetype: 'audio/ogg; codecs=opus'
          },
          {}
        );
        await sock.sendMessage(chatId, { text: info }, {});
      }
    } catch (error) {
      console.error('Error in viewonce command:', error);
      await sock.sendMessage(
        jidNormalizedUser(sock.user.id),
        {
          text:
            '❌ Error processing view-once message: ' +
            (error.message || 'Unknown error')
        },
        {}
      );
    }
  }
};
