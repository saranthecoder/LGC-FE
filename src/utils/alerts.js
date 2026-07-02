import Swal from 'sweetalert2';

const gamifiedSwal = Swal.mixin({
  background: '#151522',
  color: '#ffffff',
  customClass: {
    popup: 'gamified-alert-popup',
    title: 'gamified-alert-title',
    htmlContainer: 'gamified-alert-text',
    confirmButton: 'btn btn-primary',
    cancelButton: 'btn btn-outline'
  },
  buttonsStyling: false
});

export const alerts = {
  success: (title, text) => {
    return gamifiedSwal.fire({
      icon: 'success',
      iconColor: 'var(--accent-green)',
      title,
      text,
      timer: 2500,
      timerProgressBar: true
    });
  },

  error: (title, text) => {
    return gamifiedSwal.fire({
      icon: 'error',
      iconColor: 'var(--accent-magenta)',
      title,
      text
    });
  },

  info: (title, text) => {
    return gamifiedSwal.fire({
      icon: 'info',
      iconColor: 'var(--accent-blue)',
      title,
      text
    });
  },

  confirm: async (title, text, confirmText = 'Yes') => {
    const result = await gamifiedSwal.fire({
      title,
      text,
      icon: 'question',
      iconColor: 'var(--accent-orange)',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'gamified-alert-popup',
        title: 'gamified-alert-title',
        htmlContainer: 'gamified-alert-text',
        confirmButton: 'btn btn-primary',
        cancelButton: 'btn btn-outline',
        actions: 'gamified-alert-actions'
      }
    });
    return result.isConfirmed;
  },

  configureLobby: async (title = 'Lobby Settings') => {
    const result = await gamifiedSwal.fire({
      title,
      html: `
        <div style="display: flex; flex-direction: column; gap: 14px; text-align: left; padding: 10px 0;">
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem; user-select: none;">
            <input type="checkbox" id="swal-randomize-questions" style="width: 18px; height: 18px; accent-color: var(--primary-violet);" />
            <span>Randomize / Shuffle Questions</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem; user-select: none;">
            <input type="checkbox" id="swal-randomize-options" style="width: 18px; height: 18px; accent-color: var(--primary-violet);" />
            <span>Randomize / Shuffle Options</span>
          </label>
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem; user-select: none;">
            <input type="checkbox" id="swal-negative-marking" style="width: 18px; height: 18px; accent-color: var(--primary-violet);" />
            <span>Enable Negative Marking (-250 XP per error)</span>
          </label>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
            <label style="font-size: 0.85rem; color: #aaa;">Timer Override (Seconds per question)</label>
            <select id="swal-timer-override" style="background: #09090e; color: #fff; border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; font-size: 0.9rem; width: 100%;">
              <option value="0">Default Quiz Settings</option>
              <option value="5">5 Seconds (Blitz)</option>
              <option value="10">10 Seconds (Very Fast)</option>
              <option value="20">20 Seconds (Fast)</option>
              <option value="30">30 Seconds (Standard)</option>
              <option value="60">60 Seconds (Extended)</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Start Game Lobbies 🚀',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        return {
          randomizeQuestions: document.getElementById('swal-randomize-questions').checked,
          randomizeOptions: document.getElementById('swal-randomize-options').checked,
          negativeMarking: document.getElementById('swal-negative-marking').checked,
          timeLimitOverride: Number(document.getElementById('swal-timer-override').value)
        };
      }
    });
    return result.isConfirmed ? result.value : null;
  }
};
