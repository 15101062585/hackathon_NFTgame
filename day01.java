import java.security.*;


public class day01 {

    /**
     * 对输入字符串进行 SHA-256 哈希计算
     * 
     * @param input 输入的字符串
     * @return 哈希后的十六进制字符串
     */
    public static String applySha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1)
                    hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * 实现工作量证明逻辑
     * 
     * @param name       15101062585
     * @param difficulty 难度值，即哈希前导 0 的数量
     * @return 满足条件的 nonce 值和所需尝试次数
     */
    public static String[] proofOfWork(String name, int difficulty) {
        String target = new String(new char[difficulty]).replace('\0', '0');
        long nonce = 0;
        long attempts = 0;
        long startTime = System.currentTimeMillis();
        String hash = "";
        while (true) {
            String data = name + nonce;
            hash = applySha256(data);
            attempts++;
            if (hash.substring(0, difficulty).equals(target)) {
                long endTime = System.currentTimeMillis();
                double seconds = (endTime - startTime) / 1000.0;
                System.out.println("找到满足条件的哈希: " + hash);
                System.out.println("使用的 nonce: " + data);
                System.out.println("尝试次数: " + attempts);
                System.out.println("耗时: " + seconds + " 秒");
                break;
            }
            nonce++;
        }
        return new String[] { hash, attempts + "" };
    }

    public static void main(String[] args) {
        try {
            // 演示工作量证明
            String yourName = "15101062585";
            int difficulty = 4;
            System.out.println("===== 演示工作量证明 =====");
            String[] proofOfWork = proofOfWork(yourName, difficulty);

            int difficulty1 = 5;
            proofOfWork(yourName, difficulty1);

            // 1. 生成一个公私钥对
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
            keyGen.initialize(2048);
            KeyPair keyPair = keyGen.generateKeyPair();
            PrivateKey privateKey = keyPair.getPrivate();
            PublicKey publicKey = keyPair.getPublic();

            // 获取符合 POW 4 个 0 开头的哈希值对应的 “昵称 + nonce”
            String data = proofOfWork[0];
            String hash = applySha256(data);

            // 2. 用私钥对 “昵称 + nonce” 进行私钥签名
            Signature signature = Signature.getInstance("SHA256withRSA");
            signature.initSign(privateKey);
            signature.update(data.getBytes());
            byte[] digitalSignature = signature.sign();

            // 3. 用公钥验证签名
            signature.initVerify(publicKey);
            signature.update(data.getBytes());
            boolean isValid = signature.verify(digitalSignature);

            System.out.println("===== 签名验证 =====");
            System.out.println("数据: " + data);
            System.out.println("哈希: " + hash);
            System.out.println("签名验证结果: " + (isValid ? "成功" : "失败"));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

}
