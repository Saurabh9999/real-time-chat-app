import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handlesubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("user/email/forget-password", {
        email,
      });

      console.log(response.data);
      alert(response.data.message);

      navigate("/reset-password", {
      state: { email },
    });
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Something went wrong");
    }
  };
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handlesubmit}
        className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-center mb-6">Forgot Password</h2>

        <input
          type="email"
          value={email}
          placeholder="Email"
          className="w-full border border-gray-300 rounded-md p-3 mb-4"
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-md"
        >
          send reset link
        </button>
      </form>
    </div>
  );
}
