import { Message } from '@/models/Message';
import { emitMessageUpdate } from '@/socket/handlers';
import { io } from '@/index';

/**
 * Runs a background job to delete self-destructing messages that have expired.
 */
export function startCleanupJob() {
  // Run every 10 seconds
  setInterval(async () => {
    try {
      const now = new Date();
      // Find all messages that have expired but are not yet marked as deleted
      const expiredMessages = await Message.find({
        selfDestructAt: { $lte: now },
        deleted: false,
      });

      for (const msg of expiredMessages) {
        msg.deleted = true;
        msg.ciphertext = ''; // Wipe ciphertext
        await msg.save();

        // Emit realtime update to remove/replace with tombstone on clients
        emitMessageUpdate(io, msg.chatId.toString(), {
          messageId: msg._id,
          type: 'delete',
        });
      }
    } catch (error) {
      console.error('Cleanup job error:', error);
    }
  }, 10000);
}
