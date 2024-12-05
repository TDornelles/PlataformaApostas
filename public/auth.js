window.Auth = class Auth {
    static isAuthenticated() {
        return !!localStorage.getItem('userData');
    }

    static getUserData() {
        return JSON.parse(localStorage.getItem('userData'));
    }

    static async login(email, password) {
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                throw new Error('Invalid credentials');
            }

            const userData = await response.json();
            localStorage.setItem('userData', JSON.stringify(userData));
            return userData;

        } catch (error) {
            throw new Error('Invalid credentials');
        }
    }

    static logout() {
        localStorage.removeItem('userData');
    }

    static updateBalance(newBalance) {
        const userData = this.getUserData();
        if (userData) {
            userData.balance = newBalance;
            localStorage.setItem('userData', JSON.stringify(userData));
        }
    }
}