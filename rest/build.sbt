val SCALA_VERSION = "2.12.13"

name := "material-explorer"
organization := "jp.opap"
version := "0.0.1"
scalaVersion := SCALA_VERSION
javacOptions ++= Seq("-encoding", "UTF-8")

val akkaHttpVersion = "10.1.12"
val circeVersion = "0.13.0"

val workaround: Unit = {
  sys.props += "packaging.type" -> "jar"
  ()
}

libraryDependencies ++= Seq(
  "org.gitlab4j" % "gitlab4j-api" % "4.6.5" excludeAll(
    ExclusionRule(organization = "org.glassfish.jersey.inject"),
    ExclusionRule(organization = "org.glassfish.jersey.core"),
  ),

  "com.typesafe.akka" %% "akka-http" % akkaHttpVersion,
  "com.typesafe.akka" %% "akka-http-core" % akkaHttpVersion,
  "com.typesafe.akka" %% "akka-http-spray-json" % akkaHttpVersion,
  "com.typesafe.akka" %% "akka-stream" % "2.5.31",
  "ch.megard" %% "akka-http-cors" % "1.0.0",

  "io.circe" %% "circe-core" % circeVersion,
  "io.circe" %% "circe-generic" % circeVersion,
  "io.circe" %% "circe-generic-extras" % circeVersion,
  "io.circe" %% "circe-parser" % circeVersion,
  "de.heikoseeberger" %% "akka-http-circe" % "1.31.0",
  "org.latestbit" %% "circe-tagged-adt-codec" % "0.9.1",

  "org.mongodb" % "mongo-java-driver" % "3.5.0",

  "org.eclipse.jgit" % "org.eclipse.jgit" % "4.9.0.201710071750-r",

  "org.apache.httpcomponents" % "httpmime" % "4.5.3",
  "org.apache.httpcomponents" % "fluent-hc" % "4.5.3",

  "org.yaml" % "snakeyaml" % "1.19",

  "org.scala-lang" % "scala-reflect" % SCALA_VERSION,
)

libraryDependencies ++= Seq(
  "org.scalatest" %% "scalatest" % "3.0.3" % "test",
  "org.mockito" % "mockito-core" % "2.15.0" % "test"
)

resolvers ++= Seq("snapshots", "releases").map(Resolver.sonatypeRepo)
initialCommands := "import jp.opap.material._"

assemblyOutputPath in assembly := file(s"target/${name.value}.jar")
assemblyMergeStrategy in assembly := {
  case PathList("javax", "servlet", xs @ _*)         => MergeStrategy.first
  case PathList(ps @ _*) if ps.last endsWith ".properties" => MergeStrategy.first
  case PathList(ps @ _*) if ps.last endsWith ".xml" => MergeStrategy.first
  case PathList(ps @ _*) if ps.last endsWith ".types" => MergeStrategy.first
  case PathList(ps @ _*) if ps.last endsWith ".class" => MergeStrategy.first
  case x =>
    val oldStrategy = (assemblyMergeStrategy in assembly).value
    oldStrategy(x)
}
