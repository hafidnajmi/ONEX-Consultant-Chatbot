document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("consultantForm");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const service = document.getElementById("service").value;

    if (!name || !email || !service) {
      alert("Please fill in all fields.");
      return;
    }

    // Validasi email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    // Simulasi pengiriman data
    console.log({
      name,
      email,
      service
    });

    // Tampilkan pesan sukses
    alert(`Thank you, ${name}!\nYour request for "${service}" has been submitted.`);

    // Reset form
    form.reset();
  });
});