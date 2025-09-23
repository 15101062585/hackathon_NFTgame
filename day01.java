import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
// Java 基础程序模板
// 由于当前文件名为 day01.java，而定义的是 public 类 Main，应将文件重命名为 Main.java 以符合 Java 规范
// 以下代码仅在文件重命名为 Main.java 后才能正常工作
public class day01 {
    
     /**
     * 对输入字符串进行 SHA-256 哈希计算
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
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * 实现工作量证明逻辑
     * @param name 自定义名字
     * @param difficulty 难度值，即哈希前导 0 的数量
     * @return 满足条件的 nonce 值和所需尝试次数
     */
    public static long[] proofOfWork(String name, int difficulty) {
        String target = new String(new char[difficulty]).replace('\0', '0');
        long nonce = 0;
        long attempts = 0;
        long startTime = System.currentTimeMillis();

        while (true) {
            String data = name + nonce;
            String hash = applySha256(data);
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
        return new long[]{nonce, attempts};
    }
    public static void main(String[] args) {
       
        String yourName = "15101062585"; 
        int difficulty = 4;
        proofOfWork(yourName, difficulty);
        
        int difficulty1 = 5;
        proofOfWork(yourName, difficulty1);
    }
}
