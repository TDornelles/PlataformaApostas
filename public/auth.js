function handleLoginSuccess(response) {
    localStorage.setItem('token', response.token);
    localStorage.setItem('userData', JSON.stringify(response.userData));
    
    // Update display
    updateUserDisplay(response.userData);
} 