#pragma warning disable CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.
public interface IBaseExfil
{
    long? max_total_size { get; set; }
    int? chunk_size { get; set; }
}

public interface IBaseAwsSettings
{
    string access_key_id { get; set; }
    string secret_access_key { get; set; }
    string region { get; set; }
}

public class General
{
    public string host { get; set; }
    public int port { get; set; }
    public string totp_secret { get; set; }
    public int jwt_expiry { get; set; }
}

public class ExtensionItem<T>
{
    public string type { get; set; }
    public string name { get; set; }
    public string display_name { get; set; }
    public string description { get; set; }
    public T config { get; set; }
}

public class BaseStorage
{
    public int file_expiry { get; set; }
    public long max_size { get; set; }
}

public class StorageFileSystem : BaseStorage
{
    public string folder { get; set; }
}

public class ExfilBasicHTTPServer
{
    public string host { get; set; }
    public int port { get; set; }
}

public class ExfilBasicHTTP : IBaseExfil
{
    public long? max_total_size { get; set; }
    public int? chunk_size { get; set; }
    public List<string> hosts { get; set; }
    public ExfilBasicHTTPServer server { get; set; }
}

public enum TransferMode
{
    Dynamic,
    Static
}

public class TransferConfig
{
    public TransferMode mode { get; set; }
    public List<string> hosts { get; set; }
    public int? max_dynamic_hosts { get; set; }
    public int max_duration { get; set; }
}

public class ExfilAwsCloudFront : IBaseExfil, IBaseAwsSettings
{
    public long? max_total_size { get; set; }
    public int? chunk_size { get; set; }
    public string access_key_id { get; set; }
    public string secret_access_key { get; set; }
    public string region { get; set; }
    public string distribution_tag { get; set; }
    public string domain { get; set; }
    public string folder { get; set; }
    public TransferConfig upload { get; set; }
    public TransferConfig download { get; set; }
}

public class StorageAwsS3 : BaseStorage, IBaseAwsSettings
{
    public string access_key_id { get; set; }
    public string secret_access_key { get; set; }
    public string region { get; set; }
    public string bucket { get; set; }
    public bool generate_presigned_urls { get; set; }
    public string user_arn { get; set; }
}

public class Config
{
    public General general { get; set; }
    public List<ExtensionItem<StorageFileSystem>> storage { get; set; }
    public List<ExtensionItem<ExfilBasicHTTP>> exfil { get; set; }
}
#pragma warning restore CS8618 // Non-nullable field must contain a non-null value when exiting constructor. Consider adding the 'required' modifier or declaring as nullable.