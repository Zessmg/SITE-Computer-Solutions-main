const { createClient } = require('@supabase/supabase-js');

const url = 'https://bpcodbujtqqlnzxvfsyx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwY29kYnVqdHFxbG56eHZmc3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2Nzc2MjksImV4cCI6MjEwMDI1MzYyOX0.EPnsdb8qXt5lsj0lMefDwpyAnKuH72mWHsR7dJCg-8o';

const supabase = createClient(url, key);

const usersToCreate = [
  { email: 'admin@sitesolutions.com', password: 'admin123' },
  { email: 'vendedor@sitesolutions.com', password: 'admin123' },
  { email: 'soporte@sitesolutions.com', password: 'admin123' },
  { email: 'tecnico@sitesolutions.com', password: 'admin123' },
  { email: 'geeraa123@gmail.com', password: 'admin123' }
];

async function createUsers() {
  console.log("Iniciando creación/registro de usuarios demo en Supabase...");
  for (const user of usersToCreate) {
    try {
      console.log(`Registrando: ${user.email} con contraseña: ${user.password}`);
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.email.split('@')[0].toUpperCase() + ' (Demo)',
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email.split('@')[0]}`
          }
        }
      });
      if (error) {
        console.error(`Error registrando ${user.email}:`, error.message);
      } else {
        console.log(`¡Éxito! Usuario ${user.email} registrado correctamente.`);
      }
    } catch (err) {
      console.error(`Excepción para ${user.email}:`, err);
    }
  }
  console.log("Proceso terminado.");
}

createUsers();
