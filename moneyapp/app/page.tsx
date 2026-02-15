"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

const EMOJIS = ["🟢", "🔵", "🟡", "🟠", "🟣", "🟥", "🟦", "🟨"];

function AuthPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLogin, setIsLogin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [users, setUsers] = useState<{ name: string; emoji: string }[]>([]);

  const { register: registerRegister, handleSubmit: handleRegisterSubmit, formState: { errors: registerErrors }, reset: resetRegister } = useForm();
  const { handleSubmit: handleLoginSubmit } = useForm();

  // Load all registered users
  const loadUsers = () => {
    const keys = Object.keys(localStorage)
      .filter((key) => key.startsWith("user-"))
      .map((key) => key.replace("user-", ""));
    const userList = keys.map((name, index) => ({
      name,
      emoji: EMOJIS[index % EMOJIS.length],
    }));
    setUsers(userList);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const appendPin = (digit: string) => {
    if (pinInput.length < 6) setPinInput(pinInput + digit);
  };

  const backspacePin = () => setPinInput(pinInput.slice(0, -1));

  // Register user
  const onRegister = (data: any) => {
    const trimmedName = data.name.trim();
    if (!/^\d{6}$/.test(pinInput)) {
      setMessage("Your PIN must have exactly 6 digits");
      return;
    }

    const existingUser = localStorage.getItem(`user-${trimmedName}`);
    if (existingUser) {
      setMessage("This name is already registered. Try another!");
      return;
    }

    localStorage.setItem(`user-${trimmedName}`, JSON.stringify({ name: trimmedName, pin: pinInput }));
    setMessage(`Hi ${trimmedName}! You are now registered!`);
    resetRegister();
    setPinInput("");
    loadUsers();
  };

  // Login user
  const onLogin = () => {
    if (!selectedUser) {
      setMessage("Please select your account");
      return;
    }

    if (!/^\d{6}$/.test(pinInput)) {
      setMessage("Your PIN must have exactly 6 digits");
      return;
    }

    const existingUserRaw = localStorage.getItem(`user-${selectedUser}`);
    if (!existingUserRaw) {
      setMessage("We could not find this account. Try again!");
      return;
    }

    let existingUser;
    try {
      existingUser = JSON.parse(existingUserRaw);
    } catch (e) {
      setMessage("Error reading account data. Please delete and register again.");
      return;
    }

    // Debug logging - REMOVE AFTER TESTING
    console.log("Stored user data:", existingUser);
    console.log("Stored PIN:", existingUser.pin);
    console.log("Input PIN:", pinInput);
    console.log("PIN match:", existingUser.pin === pinInput);

    if (!existingUser || !existingUser.pin) {
      setMessage("This account has no valid PIN. Please delete and register again.");
      return;
    }

    if (existingUser.pin !== pinInput) {
      setMessage("Oops! PIN is incorrect. Try again.");
      return;
    }

    setMessage(`Welcome back, ${selectedUser}!`);
    localStorage.setItem("userName", selectedUser);
    localStorage.setItem("isLoggedIn", "true");
    
    // Small delay before redirect to show success message
    setTimeout(() => {
      router.push("/main");
    }, 500);
  };

  // Delete account
  const handleDeleteUser = (username: string) => {
    if (confirm(`Are you sure you want to delete ${username}?`)) {
      localStorage.removeItem(`user-${username}`);
      setMessage(`${username} has been deleted.`);
      if (selectedUser === username) setSelectedUser("");
      loadUsers();
    }
  };

  // Numpad component
  const Numpad = () => {
    const digits = ["1","2","3","4","5","6","7","8","9","0"];
    return (
      <div className="grid grid-cols-3 gap-3 mt-2">
        {digits.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => appendPin(d)}
            className="p-6 text-2xl font-bold bg-yellow-200 rounded-lg hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={backspacePin}
          className="col-span-3 p-6 text-xl font-bold bg-red-300 rounded-lg hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          ⌫ Backspace
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-blue-400 p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {/* Toggle Buttons */}
        <div className="flex justify-between mb-6">
          <button
            type="button"
            className={`px-6 py-3 rounded-2xl text-lg font-semibold ${!isLogin ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => { setIsLogin(false); setMessage(""); setPinInput(""); setSelectedUser(""); }}
          >
            Register
          </button>
          <button
            type="button"
            className={`px-6 py-3 rounded-2xl text-lg font-semibold ${isLogin ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => { setIsLogin(true); setMessage(""); setPinInput(""); setSelectedUser(""); }}
          >
            Login
          </button>
        </div>

        {/* REGISTER FORM */}
        {!isLogin ? (
          <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-4">
            <label className="block text-lg font-medium">Your Name</label>
            <input
              type="text"
              {...registerRegister("name", { required: true })}
              placeholder="Type your name here"
              className="w-full p-4 text-lg border-2 border-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {registerErrors.name && <p className="text-red-600 text-base">Please enter your name</p>}

            <label className="block text-lg font-medium">Create 6-digit PIN</label>
            <div className="p-4 border-2 border-gray-400 rounded-xl bg-gray-50 text-2xl text-center">
              {pinInput || "••••••"}
            </div>
            <Numpad />

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-blue-700 transition"
            >
              Register
            </button>
          </form>
        ) : (
          // LOGIN SECTION
          <div className="space-y-4">
            <label className="block text-lg font-medium">Select Your Account</label>
            <div className="flex flex-col gap-2">
              {users.length === 0 && <p className="text-gray-600">No accounts yet</p>}
              {users.map((user) => (
                <div key={user.name} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(user.name);
                      setMessage("");
                    }}
                    className={`px-4 py-2 rounded-lg border-2 text-lg font-semibold flex items-center gap-2 ${
                      selectedUser === user.name ? "bg-blue-500 text-white border-blue-500" : "bg-gray-200 border-gray-400"
                    }`}
                  >
                    <span>{user.emoji}</span> <span>{user.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user.name)}
                    className="px-2 py-1 text-red-600 font-bold rounded-lg hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <label className="block text-lg font-medium mt-4">Enter your 6-digit PIN</label>
            <div className="p-4 border-2 border-gray-400 rounded-xl bg-gray-50 text-2xl text-center">
              {pinInput || "••••••"}
            </div>
            <Numpad />

            <button
              type="button"
              onClick={onLogin}
              className="w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-blue-700 transition"
            >
              Login
            </button>
          </div>
        )}

        {message && (
          <p className="mt-4 text-center text-green-700 font-bold text-lg">{message}</p>
        )}
      </div>
    </div>
  );
}

export default AuthPage;