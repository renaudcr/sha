import { exec } from 'child_process';

function killTarget() {
  exec('tasklist /fi "imagename eq ManicTime.exe" /fo csv /nh', (err, stdout) => {
    if (stdout && stdout.includes('ManicTime.exe')) {
      exec('taskkill /f /im "ManicTime.exe"');
    }
  });
}

killTarget();
setInterval(killTarget, 10000);
